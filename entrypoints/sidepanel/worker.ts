import { MLCEngine, InitProgressReport, ChatCompletionMessageParam, prebuiltAppConfig } from "@mlc-ai/web-llm";
import { getSystemPrompt, formatUserPrompt, LANG_MAP } from "./worker-utils";
import type { Settings, ModeKey, WorkerInboundMessage, WorkerOutboundMessage, EngineType } from './types';

// ============================================================
// Global Fetch Mirror Fallback with improved error handling
// ============================================================

const originalFetch = self.fetch;

interface FetchError extends Error {
  url?: string;
  cause?: unknown;
}

self.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();
  const isBinaryOrJson = /\.(json|wasm|bin|txt|model|msgpack)$/i.test(url.split('?')[0]);
  
  const getMirror = (targetUrl: string): string | null => {
    if (targetUrl.startsWith("https://huggingface.co")) {
      return targetUrl.replace("https://huggingface.co", "https://hf-mirror.com");
    }
    if (targetUrl.startsWith("https://raw.githubusercontent.com")) {
      return `https://gh-proxy.org/${targetUrl}`;
    }
    return null;
  };

  const isValidDataResponse = (res: Response): boolean => {
    if (!res.ok) return false;
    if (isBinaryOrJson) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) return false;
    }
    return true;
  };

  // 1. Always try the requested URL first (usually original)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for original links
    const res = await originalFetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    if (isValidDataResponse(res)) return res;
  } catch (e) {
    console.warn(`[Worker Fetch] Original failed/hijacked for ${url}, trying mirror fallback...`);
  }

  // 2. Try mirror fallback if applicable
  const mirrorUrl = getMirror(url);
  if (mirrorUrl) {
    try {
      const res = await originalFetch(mirrorUrl, init);
      if (isValidDataResponse(res)) return res;
    } catch (e) {
      console.error(`[Worker Fetch] Mirror also failed for ${url}`);
    }
  }

  // 3. Final fallback to original if mirror also fails (to get the real error)
  return originalFetch(input, init);
};

// ============================================================
// WebLLM Worker with LRU Cache and Memory Management
// ============================================================

interface EngineCacheEntry {
  engine: MLCEngine;
  ready: boolean;
  lastUsed: number;
}

class WebLLMWorker {
  private static engines = new Map<string, EngineCacheEntry>();
  private static lruQueue: string[] = []; // newest at the end
  private static readonly MAX_CACHED_ENGINES = 2; // Conservative limit to avoid OOM
  private static loadLocks = new Map<string, Promise<void>>();

  static getCacheKey(settings: Settings): string {
    return `${settings.engine}:${settings.localModel || 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'}`;
  }

  private static updateLRU(key: string): void {
    this.lruQueue = this.lruQueue.filter(k => k !== key);
    this.lruQueue.push(key);
    
    // Evict if exceeded limit
    if (this.lruQueue.length > this.MAX_CACHED_ENGINES) {
      const evictedKey = this.lruQueue.shift();
      if (evictedKey) {
        this.evictEngine(evictedKey);
      }
    }
  }

  private static async evictEngine(key: string): Promise<void> {
    const entry = this.engines.get(key);
    if (entry) {
      console.log(`[Worker] Evicting engine from cache: ${key}`);
      try {
        await entry.engine.unload();
      } catch (e) {
        console.warn("[Worker] Engine unload failed:", e);
      }
      this.engines.delete(key);
    }
  }

  /**
   * Probes for valid WASM URL due to changing WebLLM prebuilt library naming rules.
   */
  static async probeWasmUrl(model: string, modelLibBase: string, modelVersion: string): Promise<string> {
    const candidates: string[] = [];
    let baseName = model.replace(/-MLC$/, "");
    
    if (baseName.includes("DeepSeek-R1-Distill-Qwen")) {
      const size = baseName.match(/(\d+(\.\d+)?B)/)?.[1] || "1.5B";
      baseName = `Qwen2-${size}-Instruct`;
    } else if (baseName.includes("DeepSeek-R1-Distill-Llama")) {
      const size = baseName.match(/(\d+(\.\d+)?B)/)?.[1] || "8B";
      baseName = `Llama-3-${size}-Instruct`;
    }

    if (baseName.includes("Qwen1.5") || baseName.includes("Qwen2.5")) {
      baseName = baseName.replace(/Qwen1\.5|Qwen2\.5/, "Qwen2");
    }
    if (baseName.includes("-Chat")) baseName = baseName.replace("-Chat", "-Instruct");
    
    const quantMatch = model.match(/q\df\d+(_\d)?/);
    let quant = quantMatch ? quantMatch[0] : "q4f16_1";
    if (quant === "q4f16_0") quant = "q4f16_1";

    const cleanBase = baseName.split('-q')[0];
    candidates.push(`${cleanBase}-${quant}-ctx4k_cs1k-webgpu.wasm`);
    candidates.push(`${cleanBase}-${quant}-webgpu.wasm`);
    if (!cleanBase.includes("-Instruct")) {
      candidates.push(`${cleanBase}-Instruct-${quant}-ctx4k_cs1k-webgpu.wasm`);
    }
    candidates.push(`${model}-webgpu.wasm`);

    console.log(`[Worker] Probing WASM candidates for ${model}...`);
    for (const wasmName of candidates) {
      const url = `${modelLibBase}/web-llm-models/${modelVersion}/${wasmName}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for probe
        const response = await fetch(url, { 
          method: 'HEAD', 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          console.log(`[Worker] Found valid WASM: ${wasmName}`);
          return url;
        }
      } catch (e) {
        console.warn(`[Worker] Probe failed for ${wasmName}:`, e);
      }
    }
    return `${modelLibBase}/web-llm-models/${modelVersion}/${candidates[0]}`;
  }

  static async getEngine(settings: Settings, onProgress?: (progress: InitProgressReport) => void): Promise<MLCEngine> {
    const cacheKey = this.getCacheKey(settings);
    const model = settings.localModel || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

    // If engine exists and is ready, just update LRU and return
    const existingEntry = this.engines.get(cacheKey);
    if (existingEntry?.ready) {
      console.log(`[Worker] Reusing cached engine for: ${cacheKey}`);
      existingEntry.lastUsed = Date.now();
      this.updateLRU(cacheKey);
      return existingEntry.engine;
    }

    // If currently loading, wait for the existing lock
    const existingLock = this.loadLocks.get(cacheKey);
    if (existingLock) {
      console.log(`[Worker] Waiting for existing load lock: ${cacheKey}`);
      await existingLock;
      const entry = this.engines.get(cacheKey);
      if (!entry) throw new Error(`Engine ${cacheKey} not found after load`);
      return entry.engine;
    }

    const modelUrl = `https://huggingface.co/mlc-ai/${model}/resolve/main/`;
    const modelVersion = "v0_2_80"; 
    const modelLibBase = `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main`;
    const versionedLibUrl = await this.probeWasmUrl(model, modelLibBase, modelVersion);

    const appConfig = {
      model_list: [
        ...prebuiltAppConfig.model_list,
        {
          model_id: model,
          model: modelUrl,
          model_lib: versionedLibUrl, 
        }
      ]
    };

    let engine = this.engines.get(cacheKey)?.engine;
    if (!engine) {
      console.log(`[Worker] Initializing new MLCEngine for: ${cacheKey}`);
      engine = new MLCEngine({ appConfig });
      this.engines.set(cacheKey, { engine, ready: false, lastUsed: Date.now() });
    }

    const entry = this.engines.get(cacheKey)!;
    if (!entry.ready) {
      const loadPromise = (async (): Promise<void> => {
        if (onProgress) {
          engine!.setInitProgressCallback(onProgress);
        }
        console.log(`[Worker] MLCEngine Loading: Model=${model}`);
        try {
          await engine!.reload(model, {
            context_window_size: 8192,
            appConfig: appConfig as unknown as Record<string, unknown>,
          } as unknown as Record<string, unknown>);
          entry.ready = true;
          entry.lastUsed = Date.now();
          this.updateLRU(cacheKey);
          console.log(`[Worker] MLCEngine Ready: ${model}`);
        } catch (error: unknown) {
          console.error(`[Worker] MLCEngine Load Error:`, error);
          entry.ready = false;
          throw error;
        } finally {
          this.loadLocks.delete(cacheKey);
        }
      })();

      this.loadLocks.set(cacheKey, loadPromise);
      await loadPromise;
    }
    return engine;
  }

  static clearAllEngines(): void {
    for (const [key, entry] of this.engines) {
      this.evictEngine(key);
    }
    this.engines.clear();
    this.lruQueue = [];
    this.loadLocks.clear();
  }
}

// ============================================================
// Request Queue Management
// ============================================================

interface QueueItem {
  text: string;
  mode: ModeKey;
  settings: Settings;
  requestId?: string;
}

const localRequestQueue: QueueItem[] = [];
let isLocalProcessing = false;

function postMessageToMain(msg: WorkerOutboundMessage): void {
  self.postMessage(msg);
}

async function processLocalQueue(): Promise<void> {
  if (isLocalProcessing || localRequestQueue.length === 0) return;
  isLocalProcessing = true;

  while (localRequestQueue.length > 0) {
    const item = localRequestQueue.shift();
    if (!item) continue;
    
    const { text, mode, settings, requestId } = item;
    try {
      console.log(`[Worker] Processing local task: ${mode}`);
      const systemPrompt = getSystemPrompt(mode, settings);
      const engine = await WebLLMWorker.getEngine(settings);
      const targetLang = LANG_MAP[settings.extensionLanguage || '中文'] || settings.extensionLanguage || 'Chinese';
      const finalPrompt = formatUserPrompt(text, mode, targetLang);
      
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt },
      ];

      const chunks = await engine.chat.completions.create({
        model: settings.localModel,
        messages,
        stream: true,
      });

      let fullText = "";
      let lastUpdateTime = 0;
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullText += content;
        const now = Date.now();
        if (now - lastUpdateTime >= 50) {
          postMessageToMain({ type: "update", text: fullText, mode, requestId });
          lastUpdateTime = now;
        }
      }
      postMessageToMain({ type: "complete", text: fullText, mode, requestId });
    } catch (error: unknown) {
      console.error("[Worker] Local Generate Error:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      postMessageToMain({ type: "error", error: errMsg, mode, requestId });
    }
  }
  isLocalProcessing = false;
}

// ============================================================
// Online API Handler
// ============================================================

interface StreamChunk {
  choices: Array<{ delta: { content?: string } }>;
}

async function handleGenerateOnline(text: string, mode: ModeKey, settings: Settings, requestId?: string): Promise<void> {
  try {
    const systemPrompt = getSystemPrompt(mode, settings);
    const targetLang = LANG_MAP[settings.extensionLanguage || '中文'] || settings.extensionLanguage || 'Chinese';
    const finalPrompt = formatUserPrompt(text, mode, targetLang);

    if (!settings.apiKey) throw new Error("请在设置中配置 API Key");

    const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.apiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalPrompt }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let lastUpdateTime = 0;

    if (reader) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const json = JSON.parse(dataStr) as StreamChunk;
            fullText += json.choices[0]?.delta?.content || "";
            const now = Date.now();
            if (now - lastUpdateTime >= 50) {
              postMessageToMain({ type: "update", text: fullText, mode, requestId });
              lastUpdateTime = now;
            }
          } catch {
            buffer = line + '\n' + buffer;
          }
        }
      }
    }
    postMessageToMain({ type: "complete", text: fullText, mode, requestId });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    postMessageToMain({ type: "error", error: errMsg, mode, requestId });
  }
}

// ============================================================
// Chrome AI Handler
// ============================================================

async function streamPromptApi(
  stream: ReadableStream<string> | AsyncIterable<string>,
  mode: ModeKey,
  requestId: string | undefined
): Promise<string> {
  let fullText = '';
  let lastUpdateTime = 0;
  
  if (stream && typeof (stream as ReadableStream<string>).getReader === 'function') {
    const reader = (stream as ReadableStream<string>).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value != null) {
        const newText = typeof value === 'string' ? value : JSON.stringify(value);
        if (fullText && newText.startsWith(fullText)) fullText = newText;
        else fullText += newText;
        const now = Date.now();
        if (now - lastUpdateTime >= 50) {
          postMessageToMain({ type: 'update', text: fullText, mode, requestId });
          lastUpdateTime = now;
        }
      }
    }
    return fullText;
  }
  
  for await (const chunk of stream as AsyncIterable<string>) {
    const newText = typeof chunk === 'string' ? chunk : (chunk as { content?: string })?.content || JSON.stringify(chunk);
    if (newText) {
      fullText += newText;
      const now = Date.now();
      if (now - lastUpdateTime >= 50) {
        postMessageToMain({ type: 'update', text: fullText, mode, requestId });
        lastUpdateTime = now;
      }
    }
  }
  return fullText;
}

interface ChromeAISession {
  promptStreaming(input: string): Promise<ReadableStream<string> | AsyncIterable<string>>;
  destroy(): Promise<void>;
}

interface ChromeAIModelAPI {
  capabilities(): Promise<{ available: 'no' | 'after-download' | 'readily' }>;
  create(options: { systemPrompt: string }): Promise<ChromeAISession>;
}

async function handleGenerateChromeAI(text: string, mode: ModeKey, settings: Settings, requestId?: string): Promise<void> {
  try {
    const ai = (globalThis as { ai?: { languageModel?: ChromeAIModelAPI } }).ai;
    const modelApi = ai?.languageModel || (globalThis as { LanguageModel?: ChromeAIModelAPI }).LanguageModel;
    if (!modelApi) throw new Error("Chrome Built-in AI not available.");

    const systemPrompt = getSystemPrompt(mode, settings);
    const session = await modelApi.create({ systemPrompt });
    const targetLang = LANG_MAP[settings.extensionLanguage || '中文'] || settings.extensionLanguage || 'Chinese';
    const finalPrompt = formatUserPrompt(text, mode, targetLang);
    const stream = await session.promptStreaming(finalPrompt);
    const fullText = await streamPromptApi(stream, mode, requestId);
    await session.destroy();
    postMessageToMain({ type: 'complete', text: fullText, mode, requestId });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    postMessageToMain({ type: 'error', error: errMsg, mode, requestId });
  }
}

// ============================================================
// Message Handler
// ============================================================

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>): Promise<void> => {
  const msg = event.data;
  
  if (msg.type === 'load') {
    if (msg.settings.engine === 'chrome-ai') {
      try {
        const ai = (globalThis as { ai?: { languageModel?: ChromeAIModelAPI; capabilities?: () => Promise<{ available: string }> } }).ai;
        const modelApi = ai?.languageModel || (globalThis as { LanguageModel?: ChromeAIModelAPI }).LanguageModel;
        if (!modelApi) throw new Error("Chrome Built-in AI not available.");
        
        let available: string = 'no';
        if (typeof modelApi.capabilities === 'function') {
          available = (await modelApi.capabilities()).available;
        } else if (ai && typeof ai.capabilities === 'function') {
          available = (await ai.capabilities()).available;
        } else {
          const session = await modelApi.create({ systemPrompt: ' ' });
          await session.destroy();
          available = 'readily';
        }

        if (available === 'no') throw new Error('Chrome Built-in AI model not downloaded');
        postMessageToMain({ type: 'ready' });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        postMessageToMain({ type: 'error', error: errMsg });
      }
    } else {
      try {
        await WebLLMWorker.getEngine(msg.settings, (progress) => {
          postMessageToMain({
            type: 'progress',
            progress: { progress: progress.progress * 100, text: progress.text }
          });
        });
        postMessageToMain({ type: 'ready' });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        postMessageToMain({ type: 'error', error: errMsg });
      }
    }
  } else if (msg.type === 'generate') {
    if (msg.settings.engine === 'chrome-ai') {
      await handleGenerateChromeAI(msg.text, msg.mode, msg.settings, msg.requestId);
    } else if (msg.settings.engine === 'online') {
      await handleGenerateOnline(msg.text, msg.mode, msg.settings, msg.requestId);
    } else {
      localRequestQueue.push({ text: msg.text, mode: msg.mode, settings: msg.settings, requestId: msg.requestId });
      await processLocalQueue();
    }
  } else if (msg.type === 'reset') {
    // Handle reset/cancel
    isLocalProcessing = false;
    localRequestQueue.length = 0;
    WebLLMWorker.clearAllEngines();
    postMessageToMain({ type: 'ready' });
  }
};
