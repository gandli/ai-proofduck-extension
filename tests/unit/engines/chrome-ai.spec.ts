/**
 * chrome-ai 引擎单元测试
 *
 * 契约（按 M1 定义的 Engine 接口 + M2 新增翻译能力）：
 * 1. isAvailable(): 检测 self.Translator 是否存在
 *    - 无 Translator 全局 → false
 *    - Translator.availability() 返回 'unavailable' → false
 *    - 返回 'available' / 'downloadable' / 'downloading' → true
 * 2. translate(text, {source, target}): 返回翻译后的完整字符串
 * 3. translateStreaming(text, {source, target}): 返回 AsyncIterable<string> 逐字流
 * 4. 缓存 translator 实例（同 sourceLanguage/targetLanguage 组合只 create 一次）
 *
 * 为什么用 Chrome 官方 Translator API 而非 LanguageModel Prompt？
 * - 官方 Translator 有专门的翻译语言包，翻译质量比 Prompt 拼 "翻译成..." 强
 * - 支持 streaming（长文本体验好）
 * - Chrome 138+ 稳定，符合我们最低目标
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createChromeAiEngine } from '@engines/chrome-ai';

// mock 全局 Translator（Chrome 内置 AI API）
type TranslatorMock = {
  translate: ReturnType<typeof vi.fn>;
  translateStreaming: ReturnType<typeof vi.fn>;
};
let translatorMock: TranslatorMock;
let availabilityValue: 'unavailable' | 'downloadable' | 'downloading' | 'available' = 'available';
let createCalls: Array<{ sourceLanguage: string; targetLanguage: string }> = [];

beforeEach(() => {
  availabilityValue = 'available';
  createCalls = [];
  translatorMock = {
    translate: vi.fn(async (t: string) => `[EN2ZH] ${t}`),
    // 流式版本：返回一个 async iterable
    translateStreaming: vi.fn((t: string) => {
      async function* gen() {
        for (const ch of `[EN2ZH] ${t}`) yield ch;
      }
      return gen();
    }),
  };

  // 注册到 globalThis
  (globalThis as unknown as { Translator: unknown }).Translator = {
    availability: vi.fn(async () => availabilityValue),
    create: vi.fn(async (opts: { sourceLanguage: string; targetLanguage: string }) => {
      createCalls.push(opts);
      return translatorMock;
    }),
  };
});

describe('chrome-ai engine', () => {
  describe('isAvailable()', () => {
    it('Translator 全局不存在时返回 false', async () => {
      delete (globalThis as unknown as { Translator?: unknown }).Translator;
      const engine = createChromeAiEngine();
      expect(await engine.isAvailable()).toBe(false);
    });

    it('Translator.availability() 返回 unavailable 时 false', async () => {
      availabilityValue = 'unavailable';
      const engine = createChromeAiEngine();
      expect(await engine.isAvailable()).toBe(false);
    });

    it('availability 为 available 时 true', async () => {
      const engine = createChromeAiEngine();
      expect(await engine.isAvailable()).toBe(true);
    });

    it('availability 为 downloadable 时也算可用（可触发下载）', async () => {
      availabilityValue = 'downloadable';
      const engine = createChromeAiEngine();
      expect(await engine.isAvailable()).toBe(true);
    });
  });

  describe('translate()', () => {
    it('调用 translator.translate 并返回结果', async () => {
      const engine = createChromeAiEngine();
      const result = await engine.translate('hello', { source: 'en', target: 'zh' });
      expect(result).toBe('[EN2ZH] hello');
      expect(translatorMock.translate).toHaveBeenCalledWith('hello');
    });

    it('相同 source/target 复用同一个 translator 实例（缓存）', async () => {
      const engine = createChromeAiEngine();
      await engine.translate('a', { source: 'en', target: 'zh' });
      await engine.translate('b', { source: 'en', target: 'zh' });
      expect(createCalls.length).toBe(1);
    });

    it('不同语言对创建不同 translator', async () => {
      const engine = createChromeAiEngine();
      await engine.translate('a', { source: 'en', target: 'zh' });
      await engine.translate('b', { source: 'zh', target: 'en' });
      expect(createCalls.length).toBe(2);
    });
  });

  describe('translateStreaming()', () => {
    it('返回可以逐字迭代的 AsyncIterable', async () => {
      const engine = createChromeAiEngine();
      const stream = engine.translateStreaming('hi', { source: 'en', target: 'zh' });
      const chunks: string[] = [];
      for await (const chunk of stream) chunks.push(chunk);
      expect(chunks.join('')).toBe('[EN2ZH] hi');
      expect(chunks.length).toBeGreaterThan(1); // 确实是流式，不是一次吐完
    });
  });

  describe('Engine 接口一致性', () => {
    it('id === chrome-ai', () => {
      const engine = createChromeAiEngine();
      expect(engine.id).toBe('chrome-ai');
    });

    it('name 是非空展示字符串', () => {
      const engine = createChromeAiEngine();
      expect(typeof engine.name).toBe('string');
      expect(engine.name.length).toBeGreaterThan(0);
    });

    it('priority 是数字', () => {
      const engine = createChromeAiEngine();
      expect(typeof engine.priority).toBe('number');
    });

    it('supports(translate) 为 true，其他为 false（M2 Cycle 1 只做翻译）', () => {
      const engine = createChromeAiEngine();
      expect(engine.supports('translate')).toBe(true);
      expect(engine.supports('summarize')).toBe(false);
      expect(engine.supports('expand')).toBe(false);
    });

    it('run() 走通用 EngineRunInput 契约', async () => {
      const engine = createChromeAiEngine();
      const out = await engine.run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' });
      expect(out).toBe('[EN2ZH] hi');
    });

    it('run() 不支持的模式抛错', async () => {
      const engine = createChromeAiEngine();
      await expect(engine.run({ mode: 'summarize', text: 'hi' })).rejects.toThrow(/不支持/);
    });

    it('runStreaming() 走通用接口，chunk 逐字出', async () => {
      const engine = createChromeAiEngine();
      const chunks: string[] = [];
      for await (const c of engine.runStreaming!({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' })) {
        chunks.push(c);
      }
      expect(chunks.join('')).toBe('[EN2ZH] hi');
    });
  });
});
