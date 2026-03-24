import { type EngineProgress, type EngineType, RUNTIME_MESSAGES, type Settings } from '../shared/contracts';
import { getEngineAttemptOrder } from '../../lib/processing/engine-orchestrator';
import { executeChromeEngine } from '../../lib/processing/engines/chrome-engine';
import { executeOnline } from '../../lib/processing/engines/online-engine';
import { readStoredTestEngineOverride } from '../../lib/processing/test-engine-override';
import { executeTranslationFallback } from '../../lib/processing/engines/translation-fallback-engine';

const OFFSCREEN_PORT = 'proofduck-offscreen-port';
const OFFSCREEN_EXECUTE = 'proofduck:offscreen-translation-execute';
const OFFSCREEN_RESULT = 'proofduck:offscreen-translation-result';
const OFFSCREEN_READY = 'proofduck:offscreen-ready';

async function handleRequest(request: {
  text: string;
  settings: Settings;
}) {
  if (!request?.text) {
    throw new Error('缺少待翻译文本');
  }

  const response = await executeOffscreenProcessing({
    text: String(request.text ?? ''),
    mode: 'translate',
    settings: request.settings,
  })
    .then((result) => ({ ok: true, ...result }))
    .catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));

  return response;
}

function isOnlineConfigured(settings: Settings) {
  return Boolean(settings.onlineApiBase && settings.onlineApiKey && settings.onlineModel);
}

async function executeOffscreenProcessing(input: {
  text: string;
  mode: 'translate';
  settings: Settings;
  onProgress?: (progress: EngineProgress) => void;
}): Promise<{
  result: string;
  notice: string;
  engine: EngineType;
  localRuntime: 'webgpu' | 'wasm' | null;
  fallbackUsed: boolean;
}> {
  const attempts = getEngineAttemptOrder(input.mode, input.settings);
  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const storedOverride = await readStoredTestEngineOverride(attempt.engine);
      if (storedOverride) {
        return {
          result: storedOverride.result,
          notice: storedOverride.notice,
          engine: storedOverride.engine,
          localRuntime: storedOverride.localRuntime,
          fallbackUsed: storedOverride.fallbackUsed,
        };
      }

      if (attempt.engine === 'chrome-ai') {
        const execution = await executeChromeEngine(input);
        return {
          result: execution.result,
          notice: execution.notice,
          engine: 'chrome-ai',
          localRuntime: null,
          fallbackUsed: false,
        };
      }

      if (attempt.engine === 'local') {
        const { executeLocalWebLlm } = await import('../../lib/processing/engines/local-webllm-engine');
        const execution = await executeLocalWebLlm(input);
        return {
          result: execution.result,
          notice: execution.notice,
          engine: 'local',
          localRuntime: execution.runtime,
          fallbackUsed: execution.runtime === 'wasm',
        };
      }

      if (attempt.engine === 'online') {
        if (!isOnlineConfigured(input.settings)) {
          throw new Error('在线 API 未配置');
        }

        const execution = await executeOnline(input);
        return {
          result: execution.result,
          notice: execution.notice,
          engine: 'online',
          localRuntime: null,
          fallbackUsed: false,
        };
      }

      if (attempt.engine === 'fallback') {
        const execution = await executeTranslationFallback(input.text, input.settings);
        return {
          result: execution.result,
          notice: execution.notice,
          engine: 'fallback',
          localRuntime: null,
          fallbackUsed: true,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${attempt.engine}: ${message}`);
    }
  }

  throw new Error(errors.join('；') || '没有可用的处理引擎');
}

const port = browser.runtime.connect({ name: OFFSCREEN_PORT });

port.onMessage.addListener((message) => {
  if (message?.type !== OFFSCREEN_EXECUTE || !message?.id) {
    return;
  }

  const payload = message.payload as { text: string; settings: Settings };
  void handleRequest(payload).then((result) => {
    port.postMessage({
      type: OFFSCREEN_RESULT,
      id: message.id,
      payload: result,
    });
  });
});

port.postMessage({
  type: OFFSCREEN_READY,
});
