import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Settings } from '../../shared/contracts';
import { executeProcessing } from './executeProcessing';

const onlineSettings: Settings = {
  targetLanguage: 'English',
  enginePreference: 'online',
  localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  localAllowWasmFallback: true,
  translationFallbackEnabled: true,
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

  it('falls back for translate mode when online api request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [[['Fallback translation']]],
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
    expect(result.result).toContain('Fallback translation');
    expect(result.notice).toContain('兜底');
  });
});
