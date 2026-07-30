/** Gemini 引擎单元测试 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const storage: { value: { apiKey?: string; model?: string } } = { value: {} };
  return { storage };
});

import { createGeminiEngine } from '@engines/gemini';

describe('createGeminiEngine', () => {
  beforeEach(() => {
    mocks.storage.value = {};
    vi.stubGlobal('fetch', vi.fn());
    // Gemini 引擎直接调 chrome.storage.local.get — 在 fakeBrowser.reset() 后覆盖
    const _chrome = (globalThis as { chrome?: Record<string, unknown> }).chrome ?? {};
    (globalThis as { chrome?: Record<string, unknown> }).chrome = {
      ..._chrome,
      storage: {
        ...(_chrome.storage as Record<string, unknown> ?? {}),
        local: { get: async (_key: string) => {
          if (mocks.storage.value.apiKey) {
            return { geminiConfig: mocks.storage.value };
          }
          return {};
        }},
      },
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('engine identity', () => {
    it('id = gemini', () => {
      expect(createGeminiEngine().id).toBe('gemini');
    });

    it('name = Gemini', () => {
      expect(createGeminiEngine().name).toBe('Gemini');
    });

    it('priority = 80', () => {
      expect(createGeminiEngine().priority).toBe(80);
    });
  });

  describe('supports', () => {
    it('true for all 5 modes', () => {
      const engine = createGeminiEngine();
      for (const mode of ['translate', 'summarize', 'correct', 'polish', 'expand'] as const) {
        expect(engine.supports(mode)).toBe(true);
      }
    });
  });

  describe('isAvailable', () => {
    it('apiKey 已配置 → true', async () => {
      mocks.storage.value = { apiKey: 'AIzaSyTest', model: 'gemini-2.0-flash' };
      expect(await createGeminiEngine().isAvailable()).toBe(true);
    });

    it('缺 apiKey → false', async () => {
      expect(await createGeminiEngine().isAvailable()).toBe(false);
    });

    it('apiKey 空字符串 → false', async () => {
      mocks.storage.value = { apiKey: '' };
      expect(await createGeminiEngine().isAvailable()).toBe(false);
    });
  });

  describe('run', () => {
    it('成功返回译文', async () => {
      mocks.storage.value = { apiKey: 'AIzaSyTest', model: 'gemini-2.0-flash' };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Hello world' }] } }],
        }), { status: 200 }),
      );
      const result = await createGeminiEngine().run({ mode: 'translate', text: '你好', targetLang: 'en' });
      expect(result).toBe('Hello world');
    });

    it('HTTP 403 → throw', async () => {
      mocks.storage.value = { apiKey: 'AIzaSyTest' };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('API key not valid', { status: 403 }),
      );
      await expect(
        createGeminiEngine().run({ mode: 'translate', text: '你好' }),
      ).rejects.toThrow('Gemini HTTP 403');
    });

    it('空 candidates → 返回空字符串', async () => {
      mocks.storage.value = { apiKey: 'AIzaSyTest' };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
      );
      const result = await createGeminiEngine().run({ mode: 'translate', text: '你好' });
      expect(result).toBe('');
    });

    it('网络错误 → throw', async () => {
      mocks.storage.value = { apiKey: 'AIzaSyTest' };
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expect(
        createGeminiEngine().run({ mode: 'translate', text: '你好' }),
      ).rejects.toThrow('Failed to fetch');
    });

    it('abort 后拒绝并 cleanup', async () => {
      mocks.storage.value = { apiKey: 'AIzaSyTest' };
      const controller = new AbortController();
      vi.mocked(fetch).mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));
      controller.abort();
      await expect(
        createGeminiEngine().run({ mode: 'translate', text: '你好', signal: controller.signal }),
      ).rejects.toThrow('The operation was aborted');
    });
  });

  describe('systemPromptFor — all 5 modes', () => {
    const modes = ['translate', 'summarize', 'correct', 'polish', 'expand'] as const;
    for (const mode of modes) {
      it(`mode=${mode} 返回成功`, async () => {
        mocks.storage.value = { apiKey: 'AIzaSyMulti' };
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: `result-${mode}` }] } }] }), { status: 200 }),
        );
        const result = await createGeminiEngine().run({ mode, text: 'test' });
        expect(result).toBe(`result-${mode}`);
      });
    }
  });
});
