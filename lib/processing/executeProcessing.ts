import type { EngineProgress, EngineType, ModeKey, Settings } from '../../entrypoints/shared/contracts';

import { getEngineAttemptOrder } from './engine-orchestrator';
import { executeChromeEngine } from './engines/chrome-engine';
import { executeOnline } from './engines/online-engine';
import { readStoredTestEngineOverride } from './test-engine-override';
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

interface TestOverrideResult {
  result: string;
  notice: string;
  engine?: EngineType;
  localRuntime?: 'webgpu' | 'wasm' | null;
  fallbackUsed?: boolean;
}

type TestEngineOverride = (
  engine: EngineType,
  input: ExecuteProcessingInput,
) => Promise<TestOverrideResult | null | undefined> | TestOverrideResult | null | undefined;

function getTestEngineOverride() {
  const scoped = globalThis as typeof globalThis & {
    __PROOFDUCK_TEST_ENGINE_OVERRIDE__?: TestEngineOverride;
  };

  return scoped.__PROOFDUCK_TEST_ENGINE_OVERRIDE__;
}

function isOnlineConfigured(settings: Settings) {
  return Boolean(settings.onlineApiBase && settings.onlineApiKey && settings.onlineModel);
}

export async function executeProcessing(input: ExecuteProcessingInput): Promise<ExecuteProcessingResult> {
  const attempts = getEngineAttemptOrder(input.mode, input.settings);
  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const testOverride = getTestEngineOverride();
      if (testOverride) {
        const mocked = await testOverride(attempt.engine, input);
        if (mocked) {
          return {
            result: mocked.result,
            notice: mocked.notice,
            engine: mocked.engine ?? attempt.engine,
            localRuntime: mocked.localRuntime ?? null,
            fallbackUsed: mocked.fallbackUsed ?? false,
          };
        }
      }

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
