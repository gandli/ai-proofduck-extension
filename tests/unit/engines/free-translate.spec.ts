/**
 * free-translate 引擎测试（Google translate_a/single 公开端点）
 *
 * 契约：
 * 1. id='free-translate' / priority=60（低于 openai-compat 70，作为终极兜底）
 * 2. supports: 只支持 'translate' 模式（免费端点没有其他能力）
 * 3. isAvailable():
 *    - 默认 true（网络端点，只要能联网）
 *    - 用户禁用（storage `freeTranslate.enabled` = false）→ false
 * 4. run({ mode: 'translate', text, source, target }):
 *    - 走 GET translate.googleapis.com/translate_a/single?client=gtx&sl=&tl=&dt=t&q=
 *    - 解析响应 [[["译文","原文",...], ...], null, "detected-source", ...]
 *    - 拼接多段（长文本被切成多个 chunk 时）
 *    - source='auto' 时用 'auto'，Google 会自动检测
 *    - target 是必需的
 * 5. run 非 translate 模式 → 抛错（超出能力）
 * 6. runStreaming: 不实现（免费端点没有 SSE）
 * 7. 网络失败 / 非 2xx → 抛错让 EngineManager 兜底到下一个（其实没有下一个了）
 * 8. 空文本 → 直接返回空串，不发请求（省流量）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFreeTranslateEngine } from '@engines/free-translate';

// 模拟 storage：默认启用
const enabledState = { value: true };
vi.mock('@core/storage', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    defineStorage: (_key: string, defaultValue: unknown) => ({
      get: vi.fn(async () => (enabledState.value ?? defaultValue)),
      set: vi.fn(async (v: unknown) => {
        enabledState.value = v as boolean;
      }),
      watch: vi.fn(() => () => {}),
    }),
  };
});

describe('free-translate engine', () => {
  beforeEach(() => {
    enabledState.value = true;
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('id/priority/supports 契约', () => {
    const eng = createFreeTranslateEngine();
    expect(eng.id).toBe('free-translate');
    expect(eng.priority).toBe(60);
    expect(eng.supports('translate')).toBe(true);
    expect(eng.supports('summarize')).toBe(false);
    expect(eng.supports('correct')).toBe(false);
    expect(eng.supports('polish')).toBe(false);
    expect(eng.supports('expand')).toBe(false);
  });

  it('isAvailable: 默认 true', async () => {
    const eng = createFreeTranslateEngine();
    expect(await eng.isAvailable()).toBe(true);
  });

  it('isAvailable: 用户禁用 → false', async () => {
    enabledState.value = false;
    const eng = createFreeTranslateEngine();
    expect(await eng.isAvailable()).toBe(false);
  });

  it('run(translate): 发正确的请求', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [[['你好', 'hello', null, null, 10]], null, 'en'],
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    const result = await eng.run({ mode: 'translate', text: 'hello', sourceLang: 'en', targetLang: 'zh' });

    expect(result).toBe('你好');
    const calls = (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls;
    expect(calls[0][0]).toContain('translate.googleapis.com/translate_a/single');
    expect(calls[0][0]).toContain('client=gtx');
    expect(calls[0][0]).toContain('sl=en');
    expect(calls[0][0]).toContain('tl=zh');
    expect(calls[0][0]).toContain('q=hello');
  });

  it('run: source=auto 会用 auto 参数', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [[['嗨', 'hi', null, null, 10]], null, 'en'],
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    await eng.run({ mode: 'translate', text: 'hi', sourceLang: 'auto', targetLang: 'zh' });

    const url = (fetchMock as unknown as { mock: { calls: [string][] } }).mock.calls[0][0];
    expect(url).toContain('sl=auto');
  });

  it('run: 长文本响应多个 chunk → 拼接', async () => {
    // Google 会把长文本切成多个数组片段
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        [
          ['第一段。', 'First sentence.', null, null, 10],
          ['第二段。', 'Second sentence.', null, null, 10],
          ['第三段。', 'Third sentence.', null, null, 10],
        ],
        null,
        'en',
      ],
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    const result = await eng.run({
      mode: 'translate',
      text: 'First sentence. Second sentence. Third sentence.',
      sourceLang: 'en',
      targetLang: 'zh',
    });
    expect(result).toBe('第一段。第二段。第三段。');
  });

  it('run: 响应里有 null chunk → 跳过', async () => {
    // Google 偶尔会插入 null 项（比如 pronunciation transliteration）
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        [
          ['你好', 'hello', null, null, 10],
          [null, null, 'ni hao', 'hello', 10],
          ['世界', 'world', null, null, 10],
        ],
        null,
        'en',
      ],
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    const result = await eng.run({ mode: 'translate', text: 'hello world', sourceLang: 'en', targetLang: 'zh' });
    expect(result).toBe('你好世界');
  });

  it('run(非 translate): 抛错', async () => {
    const eng = createFreeTranslateEngine();
    await expect(
      eng.run({ mode: 'summarize', text: 'x', sourceLang: 'auto', targetLang: 'zh' }),
    ).rejects.toThrow(/free-translate.*仅支持.*translate/);
  });

  it('run: 空文本 → 直接返回空串，不发请求', async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    expect(await eng.run({ mode: 'translate', text: '', sourceLang: 'en', targetLang: 'zh' })).toBe('');
    expect(await eng.run({ mode: 'translate', text: '   ', sourceLang: 'en', targetLang: 'zh' })).toBe('');
    expect((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(0);
  });

  it('run: 非 2xx → 抛错并带 status', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => 'rate limit',
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    await expect(
      eng.run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' }),
    ).rejects.toThrow(/429/);
  });

  it('run: 网络失败 → 抛出原 error', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    await expect(
      eng.run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' }),
    ).rejects.toThrow(/Failed to fetch/);
  });

  it('run: JSON 结构异常（缺 data[0]）→ 抛错', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => null,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    await expect(
      eng.run({ mode: 'translate', text: 'hi', sourceLang: 'en', targetLang: 'zh' }),
    ).rejects.toThrow(/响应格式/);
  });

  it('URL 里 text 会被 encodeURIComponent（防特殊字符）', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [[['测试&测试', 'hi&bye', null, null, 10]], null, 'en'],
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const eng = createFreeTranslateEngine();
    await eng.run({ mode: 'translate', text: 'hi & bye', sourceLang: 'en', targetLang: 'zh' });

    const url = (fetchMock as unknown as { mock: { calls: [string][] } }).mock.calls[0][0];
    // "hi & bye" → hi%20%26%20bye
    expect(url).toContain('q=hi%20%26%20bye');
  });

  it('run: 缺少 targetLang → 抛错（避免 tl=undefined）', async () => {
    // Gemini review 提出的场景：EngineRunInput.targetLang 是可选的
    const eng = createFreeTranslateEngine();
    await expect(
      eng.run({ mode: 'translate', text: 'hi', sourceLang: 'en' }),
    ).rejects.toThrow(/缺少目标语言参数/);
  });

  it('runStreaming: 未实现（undefined）', () => {
    const eng = createFreeTranslateEngine();
    expect(eng.runStreaming).toBeUndefined();
  });
});
