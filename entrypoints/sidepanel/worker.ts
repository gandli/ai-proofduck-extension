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
      const engine = await WebLLMWorker.getEngine(settings);
      const finalPrompt = `[DIRECTIVE: OUTPUT ONLY THE RESULT. NO CHAT.]\n<TEXT>\n${text}\n</TEXT>\nResult:`;
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalPrompt },
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
    const finalPrompt = `[DIRECTIVE: OUTPUT ONLY THE RESULT. NO CHAT.]\n<TEXT>\n${text}\n</TEXT>\nResult:`;
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
          { role: 'user', content: finalPrompt },
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

// Helper: adaptive streaming — handles both AsyncIterable and ReadableStream
async function streamPromptApi(stream: any, mode: ModeKey, requestId: string | undefined): Promise<string> {
  let fullText = '';

  // Handle ReadableStream (e.g. from Translator, Summarizer)
  if (stream && typeof (stream as any).getReader === 'function') {
    const reader = (stream as ReadableStream<string>).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value != null) {
        const newText = typeof value === 'string' ? value : JSON.stringify(value);
        // Smart update: some Chrome AI APIs (Summarizer, Translator) return accumulated text,
        // while others might return deltas. We check if newText starts with fullText.
        if (fullText && newText.startsWith(fullText)) {
          fullText = newText;
        } else {
          fullText += newText;
        }
        self.postMessage({ type: 'update', text: fullText, mode, requestId });
      }
    }
    return fullText;
  }

  // Handle AsyncIterable (e.g. from Prompt API / LanguageModel).
  // Chrome's promptStreaming() sends DELTA chunks — each chunk is just the new text.
  // We concatenate all chunks to build the full output.
  for await (const chunk of stream) {
    const newText = typeof chunk === 'string' ? chunk : (chunk as any).content || JSON.stringify(chunk);
    if (newText) {
      fullText += newText;
      self.postMessage({ type: 'update', text: fullText, mode, requestId });
    }
  }
  return fullText;
}

async function handleGenerateChromeAI(
  text: string,
  mode: ModeKey,
  settings: Settings,
  requestId?: string,
) {
  try {
    // Use only the stable Prompt API (LanguageModel) for all modes.
    // Specialized APIs (Translator, Summarizer, Rewriter, Proofreader) cause hard
    // worker process crashes in extension service worker contexts and are not used.
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

    const systemPrompt = getSystemPrompt(mode, settings);
    const session = await modelApi.create({ systemPrompt });
    // Aggressively repeat instructions in the prompt itself to force adherence.
    const finalPrompt = `[DIRECTIVE: OUTPUT ONLY THE RESULT. NO CHAT.]\n<TEXT>\n${text}\n</TEXT>\nResult:`;
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
