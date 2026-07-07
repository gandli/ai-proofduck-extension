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
