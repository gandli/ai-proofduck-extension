import { describe, expect, it } from 'vitest';

import type { Settings } from '../../shared/contracts';
import { getEngineStatusMap, resolveEnginePlan } from './engineStatus';

const baseSettings: Settings = {
  targetLanguage: '中文',
  enginePreference: 'auto',
  localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  localAllowWasmFallback: true,
  translationFallbackEnabled: true,
  translationFallbackProvider: 'auto',
  baiduTranslateAppId: '',
  baiduTranslateKey: '',
  onlineApiBase: '',
  onlineApiKey: '',
  onlineModel: '',
};

describe('engineStatus', () => {
  it('marks online api as unavailable when config is missing', () => {
    const statuses = getEngineStatusMap(baseSettings, {
      hasLanguageModel: false,
      hasWebGpu: true,
    });

    expect(statuses.online.available).toBe(false);
    expect(statuses.online.message).toContain('未配置');
  });

  it('marks online api as available when config exists', () => {
    const statuses = getEngineStatusMap(
      {
        ...baseSettings,
        enginePreference: 'online',
        onlineApiBase: 'https://example.com/v1',
        onlineApiKey: 'test-key',
        onlineModel: 'gpt-like-model',
      },
      {
        hasLanguageModel: false,
        hasWebGpu: false,
      },
    );

    expect(statuses.online.available).toBe(true);
  });

  it('blocks when a manually selected engine is unavailable', () => {
    const plan = resolveEnginePlan(
      'translate',
      {
        ...baseSettings,
        enginePreference: 'chrome-ai',
      },
      {
        hasLanguageModel: false,
        hasWebGpu: false,
      },
    );

    expect(plan.blocked).toBe(true);
    expect(plan.notice).toContain('浏览器内置 AI当前不可用');
  });

  it('marks local engine as wasm-compatible when gpu is missing but fallback is enabled', () => {
    const statuses = getEngineStatusMap(
      {
        ...baseSettings,
        localAllowWasmFallback: true,
      },
      {
        hasLanguageModel: false,
        hasWebGpu: false,
      },
    );

    expect(statuses.local.available).toBe(true);
    expect(statuses.local.message).toContain('WASM');
  });
});
