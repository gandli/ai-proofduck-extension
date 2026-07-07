/**
 * openai-compat 引擎的脱敏 + SSE buffer 上限测试
 * 针对 v0.5.3 PR #501 Gemini review 的补丁
 *
 * 因为 sanitizeErrorBody / MAX_SSE_BUFFER 不导出（内部实现细节），
 * 通过端到端行为断言：mock fetch 让 API 返回带 apiKey 的错误 body → 断言错误消息里已脱敏
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOpenAiCompatEngine } from '@engines/openai-compat';
import { openaiCompatConfig } from '@core/openai-compat-config';

// Mock host-permissions：默认已授权
vi.mock('@core/host-permissions', () => ({
  hasHostPermission: vi.fn().mockResolvedValue(true),
}));

describe('openai-compat 错误脱敏', () => {
  beforeEach(async () => {
    await openaiCompatConfig.set({
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-testxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      model: 'gpt-test',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('run() 抛错时脱敏 sk- API key', async () => {
    const engine = createOpenAiCompatEngine();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        'Invalid API key: sk-' + 'FAKE_' + 'TESTONLY_'.repeat(3) + 'end was used',
        { status: 401 },
      ),
    );
    await expect(
      engine.run({ mode: 'translate', text: 'hi', targetLang: 'zh' }),
    ).rejects.toThrow(/sk-\*\*\*REDACTED\*\*\*/);
  });

  it('run() 抛错时脱敏 Bearer token', async () => {
    const engine = createOpenAiCompatEngine();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        'Authorization failed: Bearer ' + 'FAKE_' + 'TESTONLY_'.repeat(3) + 'end',
        { status: 403 },
      ),
    );
    await expect(
      engine.run({ mode: 'translate', text: 'hi', targetLang: 'zh' }),
    ).rejects.toThrow(/Bearer \*\*\*REDACTED\*\*\*/);
  });

  it('run() 正常响应不受脱敏影响', async () => {
    const engine = createOpenAiCompatEngine();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '你好' } }] }), {
        status: 200,
      }),
    );
    const result = await engine.run({
      mode: 'translate',
      text: 'hi',
      targetLang: 'zh',
    });
    expect(result).toBe('你好');
  });

  it('run() DeepSeek 自定义格式 apiKey 走字面量兜底脱敏（v5 P1-A 引擎侧回归）', async () => {
    // v0.5.6 P1-A（审计 v5）：sanitizeSecrets 只匹配 sk-*/Bearer/x-api-key，
    // DeepSeek dsk-*/通义千问 qwen-*/豆包等自定义格式 key 若被服务端裸回显
    // 会绕过正则漏检。修复：apiKey 字面量 split/join 兜底。
    const customKey = 'dsk-my-deepseek-custom-key-1234567890';
    await openaiCompatConfig.set({
      baseUrl: 'https://api.deepseek.com',
      apiKey: customKey,
      model: 'deepseek-chat',
    });
    const engine = createOpenAiCompatEngine();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(`invalid credentials for key = ${customKey}`, { status: 403 }),
    );
    try {
      await engine.run({ mode: 'translate', text: 'hi', targetLang: 'zh' });
      throw new Error('should have thrown');
    } catch (err) {
      const msg = String((err as Error).message);
      // 自定义格式 key 值不能出现在 error message 里
      expect(msg).not.toContain(customKey);
      expect(msg).toContain('***REDACTED***');
    }
  });

  it('run() 短 apiKey (<8 char) 不误替换 UI 文案（v5 P1-A 边界回归）', async () => {
    // key.length >= 8 门槛：如用户填了 "test" 类占位符，不应把 "test" 字样从 error body 里替换掉
    await openaiCompatConfig.set({
      baseUrl: 'https://api.example.com',
      apiKey: 'test',
      model: 'gpt',
    });
    const engine = createOpenAiCompatEngine();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Please provide a valid test API key', { status: 401 }),
    );
    try {
      await engine.run({ mode: 'translate', text: 'hi', targetLang: 'zh' });
      throw new Error('should have thrown');
    } catch (err) {
      const msg = String((err as Error).message);
      // "test" 字样应保留（不满足 8 char 门槛，不做字面量替换）
      expect(msg).toContain('test');
    }
  });

  it('run() 大 body（10KB）沙盒切 1000 char 后脱敏，<200ms（v5 P1-B 性能回归）', async () => {
    // v0.5.6 P1-B（审计 v5）：先切 1000 char 缓冲区再全局正则跑，避免大 body
    // 触发多个 SECRET_PATTERNS 的全局扫描阻塞主线程。
    await openaiCompatConfig.set({
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-ant-abcdefghijklmnopqrstuvwxyz',
      model: 'gpt',
    });
    const engine = createOpenAiCompatEngine();
    // 10KB 内含跨 1000 边界的 key 前缀
    const bigBody = 'x'.repeat(9800) + 'sk-should-be-outside-buffer-1234567890';
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(bigBody, { status: 500 }),
    );
    const t0 = performance.now();
    try {
      await engine.run({ mode: 'translate', text: 'hi', targetLang: 'zh' });
    } catch {
      // ignore
    }
    const elapsed = performance.now() - t0;
    // 缓冲区 1000 后正则量级恒定，即便 body 上 M 级也应远快于 200ms
    expect(elapsed).toBeLessThan(200);
  });
});

describe('openai-compat SSE buffer 上限', () => {
  beforeEach(async () => {
    await openaiCompatConfig.set({
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-test',
      model: 'gpt-test',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('无事件边界的持续推送会在 1 MiB 后抛错', async () => {
    const engine = createOpenAiCompatEngine();
    // 构造一个 stream：持续推送数据但从不包含 `\n\n`
    const readable = new ReadableStream({
      start(controller) {
        // 一次推 100 KiB × 20 = 2 MiB，够触发 1 MiB 阈值
        const chunk = 'x'.repeat(100 * 1024);
        for (let i = 0; i < 20; i++) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(readable, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const gen = engine.runStreaming!({
      mode: 'translate',
      text: 'hi',
      targetLang: 'zh',
    });
    await expect(async () => {
      for await (const _ of gen) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        _;
      }
    }).rejects.toThrow(/SSE buffer 超过/);
  });
});
