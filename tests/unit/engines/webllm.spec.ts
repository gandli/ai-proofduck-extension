/**
 * webllm 引擎单元测试
 *
 * 契约：
 * 1. isAvailable(): 检测 WebGPU 是否可用（navigator.gpu 存在 + requestAdapter 成功）
 * 2. run({ mode, text, ... }): 走 LLM chat completion，按 mode 拼系统 prompt
 * 3. runStreaming(): 流式 chunk 从 stream: true 的 completion 里出
 * 4. 支持全 5 种模式（translate/summarize/correct/polish/expand）
 * 5. 引擎按需初始化（首次 run 才 CreateMLCEngine，后续复用）
 * 6. 首次加载有进度回调（onProgress）
 * 7. 语言参数正确注入到翻译 prompt 里
 *
 * mock 策略：整个 @mlc-ai/web-llm 模块被 vi.mock，
 * 单测不真跑 WebGPU（CI 也不可能有）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock 会被 hoist 到文件顶部，其中不能引用普通变量。
// 用 vi.hoisted 声明的对象会一起被提升，可以安全引用。
const mocks = vi.hoisted(() => {
  const mockChatCreate = vi.fn();
  const mockUnload = vi.fn();
  const mockEngine = {
    chat: { completions: { create: mockChatCreate } },
    unload: mockUnload,
  };
  const mockCreateMLCEngine = vi.fn(async () => mockEngine);
  return { mockChatCreate, mockUnload, mockEngine, mockCreateMLCEngine };
});

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: mocks.mockCreateMLCEngine,
  prebuiltAppConfig: {
    model_list: [{ model_id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' }],
  },
}));

import { createWebLlmEngine } from '@engines/webllm';

describe('createWebLlmEngine', () => {
  beforeEach(() => {
    mocks.mockChatCreate.mockReset();
    mocks.mockUnload.mockReset();
    mocks.mockCreateMLCEngine.mockClear();
  });

  describe('isAvailable', () => {
    it('无 navigator.gpu 时返回 false', async () => {
      const original = (globalThis as any).navigator;
      (globalThis as any).navigator = {};
      const engine = createWebLlmEngine();
      expect(await engine.isAvailable()).toBe(false);
      (globalThis as any).navigator = original;
    });

    it('有 navigator.gpu.requestAdapter 且成功返回 adapter → true', async () => {
      const original = (globalThis as any).navigator;
      (globalThis as any).navigator = {
        gpu: {
          requestAdapter: vi.fn(async () => ({})),
        },
      };
      const engine = createWebLlmEngine();
      expect(await engine.isAvailable()).toBe(true);
      (globalThis as any).navigator = original;
    });

    it('requestAdapter 返回 null（如硬件不支持）→ false', async () => {
      const original = (globalThis as any).navigator;
      (globalThis as any).navigator = {
        gpu: {
          requestAdapter: vi.fn(async () => null),
        },
      };
      const engine = createWebLlmEngine();
      expect(await engine.isAvailable()).toBe(false);
      (globalThis as any).navigator = original;
    });
  });

  describe('supports', () => {
    it('全 5 种模式都支持', () => {
      const engine = createWebLlmEngine();
      expect(engine.supports('translate')).toBe(true);
      expect(engine.supports('summarize')).toBe(true);
      expect(engine.supports('correct')).toBe(true);
      expect(engine.supports('polish')).toBe(true);
      expect(engine.supports('expand')).toBe(true);
    });
  });

  describe('run（非流式）', () => {
    it('首次 run 触发 CreateMLCEngine，之后复用', async () => {
      mocks.mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: 'hello 你好' } }],
      });
      const engine = createWebLlmEngine();

      await engine.run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' });
      await engine.run({ mode: 'translate', text: 'bye', sourceLang: 'en', targetLang: 'zh' });

      expect(mocks.mockCreateMLCEngine).toHaveBeenCalledTimes(1);
      expect(mocks.mockChatCreate).toHaveBeenCalledTimes(2);
    });

    it('translate 模式：系统 prompt 里带源/目标语言代码', async () => {
      mocks.mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: '你好' } }],
      });
      const engine = createWebLlmEngine();
      await engine.run({ mode: 'translate', text: 'hello', sourceLang: 'en', targetLang: 'zh' });

      const call = mocks.mockChatCreate.mock.calls[0][0];
      const sysMsg = call.messages.find((m: any) => m.role === 'system');
      expect(sysMsg.content).toMatch(/en/);
      expect(sysMsg.content).toMatch(/zh/);
      expect(sysMsg.content).toMatch(/翻译|translate/i);
    });

    it('summarize 模式：系统 prompt 提到"摘要"', async () => {
      mocks.mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: '摘要结果' } }],
      });
      const engine = createWebLlmEngine();
      await engine.run({ mode: 'summarize', text: '一大段长文本…' });

      const sys = mocks.mockChatCreate.mock.calls[0][0].messages.find((m: any) => m.role === 'system');
      expect(sys.content).toMatch(/摘要|summar/i);
    });

    it('返回 LLM 的 message.content', async () => {
      mocks.mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: '你好世界' } }],
      });
      const engine = createWebLlmEngine();
      const result = await engine.run({ mode: 'translate', text: 'hello world', sourceLang: 'en', targetLang: 'zh' });
      expect(result).toBe('你好世界');
    });
  });

  describe('runStreaming', () => {
    it('从流式 completion 拿到逐 chunk', async () => {
      // 模拟 AsyncIterable stream
      const chunks = [
        { choices: [{ delta: { content: '你' } }] },
        { choices: [{ delta: { content: '好' } }] },
        { choices: [{ delta: { content: '世' } }] },
        { choices: [{ delta: { content: '界' } }] },
        { choices: [{ delta: {} }] }, // 空 delta 应被跳过
      ];
      mocks.mockChatCreate.mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          for (const c of chunks) yield c;
        },
      });

      const engine = createWebLlmEngine();
      const out: string[] = [];
      for await (const c of engine.runStreaming!({
        mode: 'translate',
        text: 'hi',
        sourceLang: 'en',
        targetLang: 'zh',
      })) {
        out.push(c);
      }
      expect(out.join('')).toBe('你好世界');
      // 验证是 stream:true 调用
      expect(mocks.mockChatCreate.mock.calls[0][0].stream).toBe(true);
    });
  });

  describe('Engine 接口', () => {
    it('id === webllm, priority 90（低于 chrome-ai 的 100）', () => {
      const engine = createWebLlmEngine();
      expect(engine.id).toBe('webllm');
      expect(engine.priority).toBe(90);
    });

    it('name 有值', () => {
      expect(createWebLlmEngine().name.length).toBeGreaterThan(0);
    });
  });
});
