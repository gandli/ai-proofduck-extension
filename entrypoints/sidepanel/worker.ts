import { MLCEngine, InitProgressReport, ChatCompletionMessageParam, prebuiltAppConfig } from "@mlc-ai/web-llm";

// --- Global Fetch Mirror Fallback ---
const originalFetch = self.fetch;
self.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString();
    const isBinaryOrJson = /\.(json|wasm|bin|txt|model|msgpack)$/i.test(url.split('?')[0]);
    
    const getMirror = (targetUrl: string) => {
        if (targetUrl.startsWith("https://huggingface.co")) {
            return targetUrl.replace("https://huggingface.co", "https://hf-mirror.com");
        }
        if (targetUrl.startsWith("https://raw.githubusercontent.com")) {
            return `https://gh-proxy.org/${targetUrl}`;
        }
        return null;
    };

    const isValidDataResponse = (res: Response) => {
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
// ------------------------------------
import { getSystemPrompt, LANG_MAP } from "./worker-utils";
import type { Settings, ModeKey, WorkerInboundMessage } from './types';

class WebLLMWorker {
    static engines = new Map<string, MLCEngine>();
    static engineReadyStatus = new Map<string, boolean>();
    static lruQueue: string[] = []; // newest at the end
    static MAX_CACHED_ENGINES = 2; // Conservative limit to avoid OOM

    static getCacheKey(settings: Settings) {
        return `${settings.engine || 'local-gpu'}:${settings.localModel || 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'}`;
    }

    static updateLRU(key: string) {
        this.lruQueue = this.lruQueue.filter(k => k !== key);
        this.lruQueue.push(key);
        
        // Evict if exceeded limit
        if (this.lruQueue.length > this.MAX_CACHED_ENGINES) {
            const evictedKey = this.lruQueue.shift();
            if (evictedKey) {
                const engine = this.engines.get(evictedKey);
                if (engine) {
                    console.log(`[Worker] Evicting engine from cache: ${evictedKey}`);
                    engine.unload().catch(e => console.warn("[Worker] Engine unload failed:", e));
                    this.engines.delete(evictedKey);
                    this.engineReadyStatus.delete(evictedKey);
                }
            }
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

    static loadLocks = new Map<string, Promise<void>>();

    static async getEngine(settings: Settings, onProgress?: (progress: InitProgressReport) => void) {
        const cacheKey = this.getCacheKey(settings);
        const model = settings.localModel || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

        // If engine exists and is ready, just update LRU and return
        if (this.engines.has(cacheKey) && this.engineReadyStatus.get(cacheKey)) {
            console.log(`[Worker] Reusing cached engine for: ${cacheKey}`);
            this.updateLRU(cacheKey);
            return this.engines.get(cacheKey)!;
        }

        // If currently loading, wait for the existing lock
        if (this.loadLocks.has(cacheKey)) {
            console.log(`[Worker] Waiting for existing load lock: ${cacheKey}`);
            await this.loadLocks.get(cacheKey);
            return this.engines.get(cacheKey)!;
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

        let engine = this.engines.get(cacheKey);
        if (!engine) {
            console.log(`[Worker] Initializing new MLCEngine for: ${cacheKey}`);
            engine = new MLCEngine({ appConfig });
            this.engines.set(cacheKey, engine);
        }

        if (!this.engineReadyStatus.get(cacheKey)) {
            const loadPromise = (async () => {
                if (onProgress) {
                    engine!.setInitProgressCallback(onProgress);
                }
                console.log(`[Worker] MLCEngine Loading: Model=${model}`);
                try {
                    await engine!.reload(model, {
                        context_window_size: 8192,
                        appConfig: appConfig as any,
                    } as any);
                    this.engineReadyStatus.set(cacheKey, true);
                    this.updateLRU(cacheKey);
                    console.log(`[Worker] MLCEngine Ready: ${model}`);
                } catch (error: any) {
                    console.error(`[Worker] MLCEngine Load Error:`, error);
                    this.engineReadyStatus.set(cacheKey, false);
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
}

interface QueueItem {
  text: string;
  mode: ModeKey;
  settings: Settings;
  requestId?: string;
}
const localRequestQueue: QueueItem[] = [];
let isLocalProcessing = false;

async function processLocalQueue() {
  if (isLocalProcessing || localRequestQueue.length === 0) return;
  isLocalProcessing = true;

    while (localRequestQueue.length > 0) {
        const { text, mode, settings, requestId } = localRequestQueue.shift()!;
        try {
            console.log(`[Worker] Processing local task: ${mode}`);
            const systemPrompt = getSystemPrompt(mode, settings);
            const engine = await WebLLMWorker.getEngine(settings);
            const targetLang = LANG_MAP[settings.extensionLanguage || '中文'] || settings.extensionLanguage || 'Chinese';
            const finalPrompt = `[MODE: ${mode.toUpperCase()}]\n[ACTION: PROCESS THE TEXT BELOW INTO ${targetLang}]\n<TEXT_TO_PROCESS>\n${text}\n</TEXT_TO_PROCESS>\n[FINAL RESULT]:`;
            
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
            for await (const chunk of chunks) {
                const content = chunk.choices[0]?.delta?.content || "";
                fullText += content;
                self.postMessage({ type: "update", text: fullText, mode, requestId });
            }
            self.postMessage({ type: "complete", text: fullText, mode, requestId });
        } catch (error: any) {
            console.error("[Worker] Local Generate Error:", error);
            const errMsg = error instanceof Error ? error.message : String(error);
            self.postMessage({ type: "error", error: errMsg, mode, requestId });
        }
    }
    isLocalProcessing = false;
}

async function handleGenerateOnline(text: string, mode: ModeKey, settings: Settings, requestId?: string) {
    try {
        const systemPrompt = getSystemPrompt(mode, settings);
        const targetLang = LANG_MAP[settings.extensionLanguage || '中文'] || settings.extensionLanguage || 'Chinese';
        const finalPrompt = `[MODE: ${mode.toUpperCase()}]\n[ACTION: PROCESS THE TEXT BELOW INTO ${targetLang}]\n<TEXT_TO_PROCESS>\n${text}\n</TEXT_TO_PROCESS>\n[FINAL RESULT]:`;

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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

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
                        const json = JSON.parse(dataStr);
                        fullText += json.choices[0]?.delta?.content || "";
                        self.postMessage({ type: "update", text: fullText, mode, requestId });
                    } catch (e) {
                        buffer = line + '\n' + buffer;
                    }
                }
            }
        }
        self.postMessage({ type: "complete", text: fullText, mode, requestId });
    } catch (error: any) {
        const errMsg = error instanceof Error ? error.message : String(error);
        self.postMessage({ type: "error", error: errMsg, mode, requestId });
    }
}

async function streamPromptApi(stream: any, mode: ModeKey, requestId: string | undefined): Promise<string> {
  let fullText = '';
  if (stream && typeof (stream as any).getReader === 'function') {
    const reader = (stream as ReadableStream<string>).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value != null) {
        const newText = typeof value === 'string' ? value : JSON.stringify(value);
        if (fullText && newText.startsWith(fullText)) fullText = newText;
        else fullText += newText;
        self.postMessage({ type: 'update', text: fullText, mode, requestId });
      }
    }
    return fullText;
  }
  for await (const chunk of stream) {
    const newText = typeof chunk === 'string' ? chunk : (chunk as any).content || JSON.stringify(chunk);
    if (newText) {
      fullText += newText;
      self.postMessage({ type: 'update', text: fullText, mode, requestId });
    }
  }
  return fullText;
}

async function handleGenerateChromeAI(text: string, mode: ModeKey, settings: Settings, requestId?: string) {
  try {
    const ai = (globalThis as any).ai;
    const modelApi = ai?.languageModel || (globalThis as any).LanguageModel;
    if (!modelApi) throw new Error("Chrome Built-in AI not available.");

    const systemPrompt = getSystemPrompt(mode, settings);
    const session = await modelApi.create({ systemPrompt });
    const targetLang = LANG_MAP[settings.extensionLanguage || '中文'] || settings.extensionLanguage || 'Chinese';
    const finalPrompt = `[MODE: ${mode.toUpperCase()}]\n[ACTION: PROCESS THE TEXT BELOW INTO ${targetLang}]\n<TEXT_TO_PROCESS>\n${text}\n</TEXT_TO_PROCESS>\n[FINAL RESULT]:`;
    const stream = await session.promptStreaming(finalPrompt);
    const fullText = await streamPromptApi(stream, mode, requestId);
    session.destroy();
    self.postMessage({ type: 'complete', text: fullText, mode, requestId });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    self.postMessage({ type: 'error', error: errMsg, mode, requestId });
  }
}

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>) => {
  const msg = event.data;
  if (msg.type === 'load') {
    if (msg.settings.engine === 'chrome-ai') {
      try {
        const ai = (globalThis as any).ai;
        const modelApi = ai?.languageModel || (globalThis as any).LanguageModel;
        if (!modelApi) throw new Error("Chrome Built-in AI not available.");
        
        let available = 'no';
        if (typeof modelApi.capabilities === 'function') available = (await modelApi.capabilities()).available;
        else if (ai && typeof ai.capabilities === 'function') available = (await ai.capabilities()).available;
        else {
             const session = await modelApi.create({ systemPrompt: ' ' });
             await session.destroy();
             available = 'readily';
        }

        if (available === 'no') throw new Error('Chrome Built-in AI model not downloaded');
        self.postMessage({ type: 'ready' });
      } catch (error: any) {
        self.postMessage({ type: 'error', error: error.message });
      }
    } else {
      try {
        await WebLLMWorker.getEngine(msg.settings, (progress) => {
          self.postMessage({
            type: 'progress',
            progress: { status: 'progress', progress: progress.progress * 100, text: progress.text }
          });
        });
        self.postMessage({ type: 'ready' });
      } catch (error: any) {
        self.postMessage({ type: 'error', error: error.message });
      }
    }
  } else if (msg.type === 'generate') {
    if (msg.settings.engine === 'chrome-ai') handleGenerateChromeAI(msg.text, msg.mode, msg.settings, msg.requestId);
    else if (msg.settings.engine === 'online') handleGenerateOnline(msg.text, msg.mode, msg.settings, msg.requestId);
    else {
      localRequestQueue.push({ text: msg.text, mode: msg.mode, settings: msg.settings, requestId: msg.requestId });
      processLocalQueue();
    }
  } else if (msg.type === 'reset') {
      // Handle reset/cancel if needed
      isLocalProcessing = false;
      localRequestQueue.length = 0;
      self.postMessage({ type: 'ready' });
  }
};
