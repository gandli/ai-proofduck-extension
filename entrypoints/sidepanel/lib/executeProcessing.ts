import type { EngineProgress, EngineType, ModeKey, Settings } from '../../shared/contracts';

import { getEngineAttemptOrder } from './engine-orchestrator';
import { executeChromeEngine } from './engines/chrome-engine';
import { executeOnline } from './engines/online-engine';
import { executeTranslationFallback } from './engines/translation-fallback-engine';

export interface ExecuteProcessingInput {
  text: string;
  mode: ModeKey;
  settings: Settings;
  onProgress?: (progress: EngineProgress) => void;
}

export interface ExecuteProcessingResult {
  result: string;
  notice: string;
  engine: EngineType;
  localRuntime: 'webgpu' | 'wasm' | null;
  fallbackUsed: boolean;
}

function isOnlineConfigured(settings: Settings) {
  return Boolean(settings.onlineApiBase && settings.onlineApiKey && settings.onlineModel);
}

export async function executeProcessing(input: ExecuteProcessingInput): Promise<ExecuteProcessingResult> {
  const attempts = getEngineAttemptOrder(input.mode, input.settings);
  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
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
        const { executeLocalWebLlm } = await import('./engines/local-webllm-engine');
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
