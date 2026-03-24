import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Settings } from '../../shared/contracts';
import { executeProcessing } from '../../../lib/processing/executeProcessing';

const onlineSettings: Settings = {
  targetLanguage: 'English',
  enginePreference: 'online',
  localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  localAllowWasmFallback: true,
  translationFallbackEnabled: true,
  translationFallbackProvider: 'auto',
  baiduTranslateAppId: '',
  baiduTranslateKey: '',
  onlineApiBase: 'https://example.com/v1',
  onlineApiKey: 'test-key',
  onlineModel: 'demo-model',
};

describe('executeProcessing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls online api and returns remote content when online engine is active', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Remote translation result' } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeProcessing({
      text: '你好，世界。',
      mode: 'translate',
      settings: onlineSettings,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.result).toBe('Remote translation result');
    expect(result.notice).toContain('在线 API');
  });

  it('falls back to translation service when the configured online api request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [[['Hello from Google']]],
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeProcessing({
      text: '你好，世界。',
      mode: 'translate',
      settings: {
        ...onlineSettings,
        localAllowWasmFallback: false,
      },
    });

    expect(result.engine).toBe('fallback');
    expect(result.notice).toContain('Google');
    expect(result.result).toContain('Hello from Google');
  });

  it('falls back to Baidu translation when Google fallback is unavailable but Baidu is configured', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('online down'))
      .mockRejectedValueOnce(new Error('google down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trans_result: [{ dst: 'Hello from Baidu' }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeProcessing({
      text: '你好，世界。',
      mode: 'translate',
      settings: {
        ...onlineSettings,
        baiduTranslateAppId: 'test-app-id',
        baiduTranslateKey: 'test-secret',
      },
    });

    expect(result.engine).toBe('fallback');
    expect(result.notice).toContain('百度');
    expect(result.result).toContain('Hello from Baidu');
  });
});
