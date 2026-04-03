/**
 * Google Translate Adapter 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleTranslateAdapter, googleTranslateAdapter } from '@/engines/google';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('GoogleTranslateAdapter', () => {
  let adapter: GoogleTranslateAdapter;

  beforeEach(() => {
    adapter = new GoogleTranslateAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本属性', () => {
    it('应该有正确的 id', () => {
      expect(adapter.id).toBe('google');
    });

    it('应该有正确的 name', () => {
      expect(adapter.name).toBe('Google Translate');
    });

    it('应该有正确的 category', () => {
      expect(adapter.category).toBe('translation');
    });

    it('应该有正确的 priority', () => {
      expect(adapter.priority).toBe(5);
    });

    it('应该支持多种语言', () => {
      expect(adapter.capabilities.supportedLanguages).toContain('en');
      expect(adapter.capabilities.supportedLanguages).toContain('zh');
      expect(adapter.capabilities.supportedLanguages).toContain('ja');
    });

    it('应该有合理的最大文本长度', () => {
      expect(adapter.capabilities.maxTextLength).toBe(5000);
    });
  });

  describe('checkAvailability', () => {
    it('Google Translate 作为兜底方案应该始终可用', async () => {
      const result = await adapter.checkAvailability();
      expect(result).toBe(true);
    });
  });

  describe('translate', () => {
    it('应该正确调用 Google Translate API', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          [['Translated text', 'Original text']], null, null, null, null
        ]),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await adapter.translate('Hello', 'en', 'zh');

      expect(result.engine).toBe('google');
      expect(result.translatedText).toBe('Translated text');
      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // 验证 fetch 调用参数
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calls = mockFetch.mock.calls;
      expect(calls[0]).toBeDefined();
      const [url] = calls[0]!;
      expect(url).toContain('translate.googleapis.com/translate_a/single');
      expect(url).toContain('client=gtx');
      expect(url).toContain('sl=en');
      expect(url).toContain('tl=zh');
    });

    it('当 API 返回错误时应该抛出异常', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(adapter.translate('Hello', 'en', 'zh')).rejects.toThrow(
        'Google Translate failed: HTTP 500: Internal Server Error'
      );
    });

    it('当网络错误时应该抛出异常', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(adapter.translate('Hello', 'en', 'zh')).rejects.toThrow(
        'Google Translate failed: Network error'
      );
    });

    it('当响应格式无效时应该抛出异常', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(null),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(adapter.translate('Hello', 'en', 'zh')).rejects.toThrow(
        'Invalid response format from Google Translate'
      );
    });

    it('当响应数据为空数组时应该抛出异常', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(adapter.translate('Hello', 'en', 'zh')).rejects.toThrow(
        'Invalid response format from Google Translate'
      );
    });

    it('当响应数据格式错误时应该抛出异常', async () => {
      // data[0] 不是数组的情况
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          { not: 'an array' }, null, null, null, null
        ]),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(adapter.translate('Hello', 'en', 'zh')).rejects.toThrow(
        'Invalid translation data format'
      );
    });
  });

  describe('stream', () => {
    it('应该支持流式输出', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          [['翻译结果', '原文']], null, null, null, null
        ]),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const chunks: string[] = [];
      let done = false;

      for await (const chunk of adapter.stream('Hello', 'en', 'zh')) {
        chunks.push(chunk.delta);
        done = chunk.done;
      }

      expect(done).toBe(true);
      expect(chunks.join('')).toBe('翻译结果');
    });

    it('流式输出应该分块返回', async () => {
      // 使用一个超过 chunkSize(20) 的文本来测试分块
      const longText = '这是一段很长的翻译文本，需要分成多个小块进行流式传输以测试分块功能是否正常工作';
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          [[longText, '原文']], null, null, null, null
        ]),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const chunkSizes: number[] = [];
      for await (const chunk of adapter.stream('Hello', 'en', 'zh')) {
        if (!chunk.done) {
          chunkSizes.push(chunk.delta.length);
        }
      }

      // 应该有多块输出（因为文本超过20字符）
      expect(chunkSizes.length).toBeGreaterThan(1);
      // 每块应该是 20 字符或更少（除了最后一块）
      chunkSizes.forEach((size) => {
        expect(size).toBeLessThanOrEqual(20);
      });
    });

    it('当 API 错误时流应该抛出异常', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const chunks: string[] = [];
      await expect(async () => {
        for await (const chunk of adapter.stream('Hello', 'en', 'zh')) {
          chunks.push(chunk.delta);
        }
      }).rejects.toThrow('Google Translate stream failed: Network error');
    });
  });

  describe('单例导出', () => {
    it('googleTranslateAdapter 应该导出单例实例', () => {
      expect(googleTranslateAdapter).toBeInstanceOf(GoogleTranslateAdapter);
    });
  });
});