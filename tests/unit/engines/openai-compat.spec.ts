/**
 * openai-compat 引擎单元测试
 *
 * 契约：
 * 1. isAvailable(): 三项配置（baseUrl / apiKey / model）都填了 → true；缺一 → false
 * 2. run({ mode, text, ... }): POST /chat/completions，Authorization: Bearer <key>
 * 3. runStreaming(): SSE 流式解析（data: {...}\n\n），[DONE] 终止
 * 4. 支持全 5 种模式，system prompt 与 webllm 一致
 * 5. 响应结构异常抛错（同 webllm 教训）
 * 6. 配置动态读取（每次 run 都从 storage 拿，用户改 key 无需重启扩展）
 *
 * mock 策略：storage + fetch 都 mock。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const config: {
    value: { baseUrl: string; apiKey: string; model: string };
  } = {
    value: { baseUrl: '', apiKey: '', model: '' },
  };
  const mockGet = vi.fn(async () => config.value);
  return { config, mockGet };
});

vi.mock('@core/openai-compat-config', () => ({
  openaiCompatConfig: {
    get: mocks.mockGet,
    set: vi.fn(),
    watch: vi.fn(() => () => {}),
  },
}));

import { createOpenAiCompatEngine } from '@engines/openai-compat';

describe('createOpenAiCompatEngine', () => {
  beforeEach(() => {
    mocks.config.value = { baseUrl: '', apiKey: '', model: '' };
    mocks.mockGet.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isAvailable', () => {
    it('三项都填了 → true', async () => {
      mocks.config.value = {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-test',
        model: 'deepseek-chat',
      };
      const engine = createOpenAiCompatEngine();
      expect(await engine.isAvailable()).toBe(true);
    });

    it('缺 apiKey → false', async () => {
      mocks.config.value = { baseUrl: 'https://x', apiKey: '', model: 'm' };
      expect(await createOpenAiCompatEngine().isAvailable()).toBe(false);
    });

    it('缺 baseUrl → false', async () => {
      mocks.config.value = { baseUrl: '', apiKey: 'sk', model: 'm' };
      expect(await createOpenAiCompatEngine().isAvailable()).toBe(false);
    });

    it('缺 model → false', async () => {
      mocks.config.value = { baseUrl: 'https://x', apiKey: 'sk', model: '' };
      expect(await createOpenAiCompatEngine().isAvailable()).toBe(false);
    });
  });

  describe('supports', () => {
    it('全 5 种模式都支持', () => {
      const engine = createOpenAiCompatEngine();
      expect(engine.supports('translate')).toBe(true);
      expect(engine.supports('summarize')).toBe(true);
      expect(engine.supports('correct')).toBe(true);
      expect(engine.supports('polish')).toBe(true);
      expect(engine.supports('expand')).toBe(true);
    });
  });

  describe('run（非流式）', () => {
    beforeEach(() => {
      mocks.config.value = {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-test',
        model: 'deepseek-chat',
      };
    });

    it('POST 到 baseUrl + /v1/chat/completions，带 Authorization', async () => {
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '你好' } }] }),
      })) as unknown as typeof fetch;
      vi.stubGlobal('fetch', fetchMock);

      const engine = createOpenAiCompatEngine();
      const result = await engine.run({
        mode: 'translate',
        text: 'hello',
        sourceLang: 'en',
        targetLang: 'zh',
      });

      expect(result).toBe('你好');
      const [url, init] = (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } })
        .mock.calls[0];
      expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('deepseek-chat');
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].content).toBe('hello');
      expect(body.stream).toBeUndefined();
    });

    it('trailing slash 处理：baseUrl 末尾有 / 也不出 //v1', async () => {
      mocks.config.value.baseUrl = 'https://api.deepseek.com/';
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      })) as unknown as typeof fetch;
      vi.stubGlobal('fetch', fetchMock);

      await createOpenAiCompatEngine().run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' });
      const [url] = (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
      expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
    });

    it('HTTP 非 2xx 抛错，body 里带响应文本便于排查', async () => {
      const fetchMock = vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => '{"error":"invalid api key"}',
      })) as unknown as typeof fetch;
      vi.stubGlobal('fetch', fetchMock);

      const engine = createOpenAiCompatEngine();
      await expect(
        engine.run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' }),
      ).rejects.toThrow(/401/);
    });

    it('响应结构异常抛错（同 webllm 教训）', async () => {
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [] }),
      })) as unknown as typeof fetch;
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        createOpenAiCompatEngine().run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' }),
      ).rejects.toThrow(/响应结构异常/);
    });

    it('未配置时（isAvailable=false）run 也应抛出明确错误', async () => {
      mocks.config.value = { baseUrl: '', apiKey: '', model: '' };
      await expect(
        createOpenAiCompatEngine().run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' }),
      ).rejects.toThrow(/未配置|not configured/i);
    });

    it.each([
      ['summarize', /摘要/],
      ['correct', /校对/],
      ['polish', /润色/],
      ['expand', /扩写/],
    ] as const)('%s 模式：system prompt 含 %s', async (mode, keyword) => {
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      })) as unknown as typeof fetch;
      vi.stubGlobal('fetch', fetchMock);

      await createOpenAiCompatEngine().run({ mode, text: '文本' });
      const body = JSON.parse(
        ((fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].body) as string,
      );
      const sys = body.messages.find((m: { role: string }) => m.role === 'system');
      expect(sys.content).toMatch(keyword);
    });
  });

  describe('runStreaming', () => {
    beforeEach(() => {
      mocks.config.value = {
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-test',
        model: 'deepseek-chat',
      };
    });

    it('SSE 流式：解析 data: {json}，[DONE] 终止', async () => {
      // 造一个 ReadableStream，模拟 SSE 数据
      const sseChunks = [
        'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"世"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"界"}}]}\n\n',
        'data: [DONE]\n\n',
      ];
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const c of sseChunks) controller.enqueue(encoder.encode(c));
          controller.close();
        },
      });

      const fetchMock = vi.fn(async () => ({
        ok: true,
        body: stream,
      })) as unknown as typeof fetch;
      vi.stubGlobal('fetch', fetchMock);

      const engine = createOpenAiCompatEngine();
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

      // 确认发起时 body.stream === true
      const body = JSON.parse(
        ((fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].body) as string,
      );
      expect(body.stream).toBe(true);
    });

    it('SSE 跨 chunk 拆分的 JSON 能正确重组', async () => {
      // 模拟 TCP 层的字节切割：一条 data: 被拆成两个 network chunk
      const encoder = new TextEncoder();
      const parts = [
        'data: {"choices":[{"delta":{"co',
        'ntent":"合"}}]}\n\ndata: {"cho',
        'ices":[{"delta":{"content":"并"}}]}\n\ndata: [DONE]\n\n',
      ];
      const stream = new ReadableStream({
        start(controller) {
          for (const p of parts) controller.enqueue(encoder.encode(p));
          controller.close();
        },
      });

      const fetchMock = vi.fn(async () => ({ ok: true, body: stream })) as unknown as typeof fetch;
      vi.stubGlobal('fetch', fetchMock);

      const engine = createOpenAiCompatEngine();
      const out: string[] = [];
      for await (const c of engine.runStreaming!({
        mode: 'translate',
        text: 'hi',
        sourceLang: 'en',
        targetLang: 'zh',
      })) {
        out.push(c);
      }
      expect(out.join('')).toBe('合并');
    });
  });

  describe('Engine 接口', () => {
    it('id === openai-compat, priority 70', () => {
      const engine = createOpenAiCompatEngine();
      expect(engine.id).toBe('openai-compat');
      expect(engine.priority).toBe(70);
    });

    it('name 有值', () => {
      expect(createOpenAiCompatEngine().name.length).toBeGreaterThan(0);
    });
  });
});
