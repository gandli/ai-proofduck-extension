import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Settings } from '../entrypoints/shared/contracts';
import { executeTranslationFallback } from '../lib/processing/engines/translation-fallback-engine';

const baseSettings: Settings = {
  targetLanguage: 'English',
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

describe('translation-fallback-engine', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses Google translation when the Google fallback request succeeds', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [[['Hello from Google']]],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeTranslationFallback('你好', baseSettings);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain('translate.googleapis.com');
    expect(result.notice).toContain('Google');
    expect(result.result).toContain('Hello from Google');
  });

  it('falls back to Baidu translation when Google fails and Baidu credentials are available', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('google down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trans_result: [{ dst: 'Hello from Baidu' }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeTranslationFallback('你好', {
      ...baseSettings,
      baiduTranslateAppId: 'test-app-id',
      baiduTranslateKey: 'test-secret',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain('translate.googleapis.com');
    expect(String(fetchMock.mock.calls[1]?.[0] ?? '')).toContain('fanyi-api.baidu.com');
    expect(result.notice).toContain('百度');
    expect(result.result).toContain('Hello from Baidu');
  });

  it('returns the built-in translation result when Baidu is selected without credentials', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeTranslationFallback('你好，世界。', {
      ...baseSettings,
      translationFallbackProvider: 'baidu',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.notice).toContain('百度翻译未配置');
    expect(result.result).toContain('Hello, world.');
  });
});
