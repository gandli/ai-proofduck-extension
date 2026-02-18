import { MLCEngine, InitProgressReport, ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { getSystemPrompt } from './worker-utils';
import type { Settings, ModeKey, WorkerInboundMessage } from './types';

class WebLLMWorker {
  static engine: MLCEngine | null = null;
  static currentModel = '';
  static currentEngineType = '';

  static async getEngine(settings: Settings, onProgress?: (progress: InitProgressReport) => void) {
    const model = settings.localModel || 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
    const engineType = settings.engine || 'local-gpu';

    if (!this.engine) {
      this.engine = new MLCEngine();
    }

    if (this.currentModel !== model || this.currentEngineType !== engineType) {
      if (onProgress) {
        this.engine.setInitProgressCallback(onProgress);
      }

      console.log(`[Worker] Loading WebLLM model: ${model} on ${engineType}`);
      try {
        await this.engine.reload(model, { context_window_size: 8192 });
        this.currentModel = model;
        this.currentEngineType = engineType;
      } catch (error) {
        this.currentModel = '';
        this.currentEngineType = '';
        throw error;
      }
    }

    return this.engine;
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
      const systemPrompt = getSystemPrompt(mode, settings);
      const userContent = `【待处理文本】：\n${text}`;
      const engine = await WebLLMWorker.getEngine(settings);
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ];
      const chunks = await engine.chat.completions.create({ messages, stream: true });
      let fullText = '';
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullText += content;
        self.postMessage({ type: 'update', text: fullText, mode, requestId });
      }
      self.postMessage({ type: 'complete', text: fullText, mode, requestId });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      self.postMessage({ type: 'error', error: errMsg, mode, requestId });
    }
  }

  isLocalProcessing = false;
}

async function handleGenerateOnline(
  text: string,
  mode: ModeKey,
  settings: Settings,
  requestId?: string,
) {
  try {
    const systemPrompt = getSystemPrompt(mode, settings);
    const userContent = `【待处理文本】：\n${text}`;

    if (!settings.apiKey) throw new Error('请在设置中配置 API Key');

    const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.apiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const json = JSON.parse(dataStr) as {
              choices: Array<{ delta?: { content?: string } }>;
            };
            fullText += json.choices[0]?.delta?.content || '';
            self.postMessage({ type: 'update', text: fullText, mode, requestId });
          } catch {
            buffer = line + '\n' + buffer;
          }
        }
      }
    }
    self.postMessage({ type: 'complete', text: fullText, mode, requestId });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    self.postMessage({ type: 'error', error: errMsg, mode, requestId });
  }
}

// --- Chrome Built-in AI: per-mode specialized APIs with Prompt API fallback ---

const CHROME_AI_SETUP_GUIDE =
  'Please ensure:\n' +
  '1. Chrome 138+ stable.\n' +
  "2. chrome://flags/#prompt-api-for-gemini-nano : Enabled\n" +
  "3. chrome://flags/#optimization-guide-on-device-model : Enabled BypassPerfRequirement\n" +
  "4. chrome://components/ : Click 'Check for update' on 'Optimization Guide On Device Model'\n" +
  'Relaunch Chrome after changes.';

/** Map extension language names to BCP-47 codes for Translator API */
function langToBcp47(lang: string): string {
  const map: Record<string, string> = {
    '中文': 'zh', 'English': 'en', '日本語': 'ja', '한국어': 'ko',
    'Français': 'fr', 'Deutsch': 'de', 'Español': 'es',
  };
  return map[lang] || 'en';
}

/** Tone mapping for Rewriter/Writer API */
function mapTone(tone: string): string {
  const map: Record<string, string> = {
    professional: 'more-formal', casual: 'more-casual',
    academic: 'more-formal', concise: 'more-formal',
  };
  return map[tone] || 'as-is';
}

/** Detail mapping for Writer API length */
function mapLength(detail: string): string {
  const map: Record<string, string> = {
    standard: 'medium', detailed: 'long', creative: 'long',
  };
  return map[detail] || 'medium';
}

/** Helper: stream accumulated chunks from Chrome AI APIs */
async function streamAccumulated(
  stream: AsyncIterable<string>,
  mode: ModeKey,
  requestId: string | undefined,
) {
  let fullText = '';
  for await (const chunk of stream) {
    fullText = typeof chunk === 'string' ? chunk : String(chunk);
    self.postMessage({ type: 'update', text: fullText, mode, requestId });
  }
  return fullText;
}

/** Try using the specialized Chrome AI API for this mode; returns null if unavailable */
async function trySpecializedAPI(
  text: string,
  mode: ModeKey,
  settings: Settings,
  requestId?: string,
): Promise<string | null> {
  const g = globalThis as any;

  if (mode === 'summarize' && 'Summarizer' in g) {
    const summarizer = await g.Summarizer.create({
      type: 'key-points',
      format: 'plain-text',
      length: 'medium',
    });
    const stream = summarizer.summarizeStreaming(text);
    const result = await streamAccumulated(stream, mode, requestId);
    summarizer.destroy();
    return result;
  }

  if (mode === 'translate' && 'Translator' in g) {
    const sourceLang = (await g.LanguageDetector?.create())
      ? (await (await g.LanguageDetector.create()).detect(text))?.[0]?.detectedLanguage || 'en'
      : 'en';
    const targetLang = langToBcp47(settings.extensionLanguage);
    if (sourceLang === targetLang) return text; // no-op
    const translator = await g.Translator.create({ sourceLanguage: sourceLang, targetLanguage: targetLang });
    const stream = translator.translateStreaming(text);
    const result = await streamAccumulated(stream, mode, requestId);
    translator.destroy();
    return result;
  }

  if (mode === 'proofread' && 'Rewriter' in g) {
    const rewriter = await g.Rewriter.create({
      tone: mapTone(settings.tone),
      length: 'as-is',
    });
    const stream = rewriter.rewriteStreaming(text);
    const result = await streamAccumulated(stream, mode, requestId);
    rewriter.destroy();
    return result;
  }

  if (mode === 'correct' && 'Proofreader' in g) {
    const proofreader = await g.Proofreader.create();
    // Proofreader returns corrections, not streamed text
    const corrections = await proofreader.proofread(text);
    let correctedText = text;
    // Apply corrections in reverse order to preserve offsets
    const sorted = [...corrections].sort((a: any, b: any) => b.startIndex - a.startIndex);
    for (const c of sorted) {
      if (c.replacement != null) {
        correctedText = correctedText.slice(0, c.startIndex) + c.replacement + correctedText.slice(c.endIndex);
      }
    }
    proofreader.destroy();
    self.postMessage({ type: 'update', text: correctedText, mode, requestId });
    return correctedText;
  }

  if (mode === 'expand' && 'Writer' in g) {
    const writer = await g.Writer.create({
      tone: mapTone(settings.tone),
      length: mapLength(settings.detailLevel),
    });
    const stream = writer.writeStreaming(text);
    const result = await streamAccumulated(stream, mode, requestId);
    writer.destroy();
    return result;
  }

  return null; // specialized API not available for this mode
}

/** Fallback: use Prompt API (languageModel) with system prompt */
async function fallbackPromptAPI(
  text: string,
  mode: ModeKey,
  settings: Settings,
  requestId?: string,
): Promise<string> {
  const ai = (globalThis as any).ai;
  const modelApi = ai?.languageModel || (globalThis as any).LanguageModel;

  if (!modelApi) {
    throw new Error(`Chrome Built-in AI not available.\n${CHROME_AI_SETUP_GUIDE}`);
  }

  const systemPrompt = getSystemPrompt(mode, settings);
  const userContent = `【待处理文本】：\n${text}`;
  const session = await modelApi.create({ systemPrompt });
  const stream = await session.promptStreaming(userContent);
  const result = await streamAccumulated(stream, mode, requestId);
  session.destroy();
  return result;
}

async function handleGenerateChromeAI(
  text: string,
  mode: ModeKey,
  settings: Settings,
  requestId?: string,
) {
  try {
    // Try specialized API first, fallback to Prompt API
    let result = await trySpecializedAPI(text, mode, settings, requestId);
    if (result === null) {
      result = await fallbackPromptAPI(text, mode, settings, requestId);
    }
    self.postMessage({ type: 'complete', text: result, mode, requestId });
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

        if (!modelApi) {
          const debugInfo = !ai ? "'ai' and 'LanguageModel' undefined" : "'languageModel' undefined";
          throw new Error(
            `Chrome Built-in AI not available (${debugInfo}).\n` +
              'Please ensure:\n' +
              '1. Chrome 128+ (Dev/Canary).\n' +
              "2. chrome://flags/#prompt-api-for-gemini-nano : Enabled\n" +
              "3. chrome://flags/#optimization-guide-on-device-model : Enabled BypassPerfRequirement\n" +
              "4. chrome://components/ : Click 'Check for update' on 'Optimization Guide On Device Model'\n" +
              'Relaunch Chrome after changes.',
          );
        }
        // Capabilities check with fallback
        let available = 'no';
        if (modelApi && typeof modelApi.capabilities === 'function') {
           const caps = await modelApi.capabilities();
           available = caps.available;
        } else if (ai && typeof ai.capabilities === 'function') {
           const caps = await ai.capabilities();
           available = caps.available;
        } else {
             // Fallback: capabilities() missing, try to create a session to probe availability
             try {
                const session = await modelApi.create({ systemPrompt: ' ' });
                await session.destroy();
                available = 'readily'; // If we created it, it's available
             } catch (e) {
                console.warn('Probe creation failed:', e);
                throw new Error("Chrome AI found but 'capabilities' missing and session creation failed. Update Chrome.");
             }
        }

        if (available === 'no') {
          throw new Error('Chrome Built-in AI model not downloaded');
        }
        self.postMessage({ type: 'ready' });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        self.postMessage({ type: 'error', error: errMsg });
      }
    } else {
      try {
        await WebLLMWorker.getEngine(msg.settings, (progress) => {
          self.postMessage({
            type: 'progress',
            progress: {
              status: 'progress',
              progress: progress.progress * 100,
              text: progress.text,
            },
          });
        });
        self.postMessage({ type: 'ready' });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        self.postMessage({ type: 'error', error: errMsg });
      }
    }
  } else if (msg.type === 'generate') {
    if (msg.settings.engine === 'chrome-ai') {
      handleGenerateChromeAI(msg.text, msg.mode, msg.settings, msg.requestId);
    } else if (msg.settings.engine === 'online') {
      handleGenerateOnline(msg.text, msg.mode, msg.settings, msg.requestId);
    } else {
      localRequestQueue.push({
        text: msg.text,
        mode: msg.mode,
        settings: msg.settings,
        requestId: msg.requestId,
      });
      processLocalQueue();
    }
  }
};
