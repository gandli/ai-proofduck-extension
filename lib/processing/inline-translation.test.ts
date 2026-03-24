import { describe, expect, it } from 'vitest';

import {
  buildInlineTranslationWarmupKey,
  getInlineTranslationTimeoutMs,
  getInlineTranslationUnavailableMessage,
} from './inline-translation';

describe('inline-translation helpers', () => {
  it('gives local and auto strategies more time to initialize', () => {
    expect(getInlineTranslationTimeoutMs({ enginePreference: 'local' })).toBe(60_000);
    expect(getInlineTranslationTimeoutMs({ enginePreference: 'auto' })).toBe(60_000);
    expect(getInlineTranslationTimeoutMs({ enginePreference: 'chrome-ai' })).toBe(60_000);
    expect(getInlineTranslationTimeoutMs({ enginePreference: 'online' })).toBe(15_000);
  });

  it('uses a softer message for engines that may still be warming up', () => {
    expect(getInlineTranslationUnavailableMessage({ enginePreference: 'local' })).toContain('仍在准备中');
    expect(getInlineTranslationUnavailableMessage({ enginePreference: 'auto' })).toContain('仍在准备中');
    expect(getInlineTranslationUnavailableMessage({ enginePreference: 'online' })).toContain('暂时不可用');
  });

  it('changes warmup key when engine-relevant settings change', () => {
    const base = {
      enginePreference: 'local' as const,
      targetLanguage: '中文',
      localModel: 'model-a',
      localAllowWasmFallback: true,
      translationFallbackEnabled: true,
      translationFallbackProvider: 'auto' as const,
      baiduTranslateAppId: '',
      baiduTranslateKey: '',
      onlineApiBase: '',
      onlineApiKey: '',
      onlineModel: '',
    };

    expect(buildInlineTranslationWarmupKey(base)).not.toBe(
      buildInlineTranslationWarmupKey({
        ...base,
        localModel: 'model-b',
      }),
    );
  });
});
