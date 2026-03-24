import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Settings } from '../../shared/contracts';
import { executeProcessing } from '../../../lib/processing/executeProcessing';

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

  it('fails directly when the selected online api strategy is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      executeProcessing({
        text: '你好，世界。',
        mode: 'translate',
        settings: {
          ...onlineSettings,
          localAllowWasmFallback: false,
        },
      }),
    ).rejects.toThrow(/online: network down/);
  });
});
