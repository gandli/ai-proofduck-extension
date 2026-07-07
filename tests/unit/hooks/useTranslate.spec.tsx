/**
 * useTranslate hook 单元测试
 *
 * 契约：
 * 1. 初始状态：output='', status='idle', error=null
 * 2. translate(text) 调用后进入 'loading'，chunk 到达时更新 output（流式），
 *    完成后 status='done'
 * 3. 出错时 status='error', error 有值（覆盖"引擎不可用"这类调用期错误）
 * 4. reset() 回到初始状态
 * 5. 竞态保护：新 translate 或 reset 后，旧请求的 chunk 不再影响 UI
 *
 * 依赖注入：hook 接受 engine 参数，测试用 mock 引擎。
 * 引擎「可用性」的探测由 UI 层负责（不在此 hook 契约里）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranslate } from '@hooks/useTranslate';
import type { Engine } from '@engines/types';
import { TranslationCache } from '@utils/cache';

function makeMockEngine(overrides: Partial<Engine> = {}): Engine {
  return {
    id: 'chrome-ai',
    name: 'mock',
    priority: 1,
    isAvailable: async () => true,
    supports: () => true,
    run: async ({ text }) => `[T] ${text}`,
    async *runStreaming({ text }) {
      for (const ch of `[T] ${text}`) yield ch;
    },
    ...overrides,
  };
}

describe('useTranslate', () => {
  // 测试之间要清缓存，避免相同 text 命中导致引擎不跑
  // 直接把默认 cache 关掉更简单——传 cache: null
  const noCacheOpts = { cache: null as null };
  it('初始状态', () => {
    const { result } = renderHook(() => useTranslate({ engine: makeMockEngine(), ...noCacheOpts }));
    expect(result.current.output).toBe('');
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('翻译流式更新 output，完成后 status=done', async () => {
    const engine = makeMockEngine();
    const { result } = renderHook(() => useTranslate({ engine, ...noCacheOpts }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });

    expect(result.current.output).toBe('[T] hi');
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('引擎抛错时 status=error 且 error 有内容', async () => {
    const engine = makeMockEngine({
      async *runStreaming() {
        throw new Error('翻译失败：模型未下载');
      },
    });
    const { result } = renderHook(() => useTranslate({ engine, ...noCacheOpts }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/翻译失败/);
  });

  it('Round 6 (#465): PermissionRequiredError → 报"缺少访问 X 的权限"引导授权', async () => {
    const { PermissionRequiredError } = await import('@utils/permission-error');
    const engine = makeMockEngine({
      async *runStreaming() {
        throw new PermissionRequiredError({
          origin: 'https://api.deepseek.com',
          pattern: 'https://api.deepseek.com/*',
        });
      },
    });
    const { result } = renderHook(() => useTranslate({ engine, ...noCacheOpts }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });

    expect(result.current.status).toBe('error');
    // 关键：错误信息里含域名，且引导用户去授权
    expect(result.current.error).toContain('api.deepseek.com');
    expect(result.current.error).toMatch(/授权|扩展设置/);
    // 不应该是通用的 "翻译失败"
    expect(result.current.error).not.toMatch(/^翻译失败$/);
  });

  it('reset() 清空状态', async () => {
    const { result } = renderHook(() => useTranslate({ engine: makeMockEngine(), ...noCacheOpts }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });
    expect(result.current.output).not.toBe('');

    act(() => result.current.reset());
    expect(result.current.output).toBe('');
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('引擎无 runStreaming 时降级到 run()', async () => {
    const runFn = vi.fn(async () => 'once-only');
    const engine = makeMockEngine({ runStreaming: undefined, run: runFn });
    const { result } = renderHook(() => useTranslate({ engine, ...noCacheOpts }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });

    expect(result.current.output).toBe('once-only');
    expect(result.current.status).toBe('done');
    expect(runFn).toHaveBeenCalled();
  });

  it('竞态保护：reset 期间到达的旧 chunk 不覆盖 idle 状态', async () => {
    // 造一个能被外部控制何时 yield 的 engine
    let released: (() => void) | null = null;
    const gate = new Promise<void>((r) => {
      released = r;
    });
    const engine = makeMockEngine({
      async *runStreaming() {
        yield 'first';
        await gate;
        yield 'second'; // 这个 chunk 到达时用户已经 reset 了
      },
    });
    const { result } = renderHook(() => useTranslate({ engine, ...noCacheOpts }));

    // 启动翻译（不 await）
    let translatePromise: Promise<void>;
    await act(async () => {
      translatePromise = result.current.translate('x', { source: 'en', target: 'zh' });
      // 让第一个 yield 到达
      await Promise.resolve();
    });

    // 中途 reset
    act(() => result.current.reset());
    expect(result.current.output).toBe('');
    expect(result.current.status).toBe('idle');

    // 放行第二个 chunk
    released!();
    await act(async () => {
      await translatePromise!;
    });

    // 旧请求的 second chunk 不应该覆盖 idle
    expect(result.current.output).toBe('');
    expect(result.current.status).toBe('idle');
  });

  describe('缓存集成', () => {
    it('第二次相同请求命中缓存 → 引擎只被调用一次', async () => {
      const runSpy = vi.fn(async ({ text }: { text: string }) => `[T] ${text}`);
      const engine = makeMockEngine({ run: runSpy, runStreaming: undefined });
      const cache = new TranslationCache();
      const { result } = renderHook(() => useTranslate({ engine, cache }));

      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      expect(runSpy).toHaveBeenCalledTimes(1);
      expect(result.current.output).toBe('[T] hi');

      // 第二次同 text/同语言对 → 命中缓存
      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      expect(runSpy).toHaveBeenCalledTimes(1); // 没有第二次调用
      expect(result.current.output).toBe('[T] hi');
      expect(result.current.status).toBe('done');
    });

    it('语言对不同 → 不命中缓存，引擎重新调用', async () => {
      const runSpy = vi.fn(async ({ text }: { text: string }) => `[T] ${text}`);
      const engine = makeMockEngine({ run: runSpy, runStreaming: undefined });
      const cache = new TranslationCache();
      const { result } = renderHook(() => useTranslate({ engine, cache }));

      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'fr' });
      });
      expect(runSpy).toHaveBeenCalledTimes(2);
    });

    it('cache=null → 完全不用缓存（相同请求也重跑）', async () => {
      const runSpy = vi.fn(async ({ text }: { text: string }) => `[T] ${text}`);
      const engine = makeMockEngine({ run: runSpy, runStreaming: undefined });
      const { result } = renderHook(() => useTranslate({ engine, cache: null }));

      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      expect(runSpy).toHaveBeenCalledTimes(2);
    });

    it('引擎抛错时不写入缓存 → 下次重试仍会调引擎', async () => {
      let callCount = 0;
      const engine = makeMockEngine({
        runStreaming: undefined,
        run: async ({ text }) => {
          callCount++;
          if (callCount === 1) throw new Error('boom');
          return `[T] ${text}`;
        },
      });
      const cache = new TranslationCache();
      const { result } = renderHook(() => useTranslate({ engine, cache }));

      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      expect(result.current.status).toBe('error');

      // 第二次应该重试（不能因为第一次失败缓存了什么破值）
      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      expect(callCount).toBe(2);
      expect(result.current.status).toBe('done');
      expect(result.current.output).toBe('[T] hi');
    });
  });

  // v0.5.3 P0-1: fetch 超时 / AbortController 传播
  describe('signal 传播 & abort 处理', () => {
    it('translate 调用时会给 engine 传入 AbortSignal', async () => {
      let receivedSignal: AbortSignal | undefined;
      const engine = makeMockEngine({
        runStreaming: undefined,
        run: async (input) => {
          receivedSignal = input.signal;
          return `[T] ${input.text}`;
        },
      });
      const { result } = renderHook(() => useTranslate({ engine, cache: null }));
      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
      expect(receivedSignal?.aborted).toBe(false);
    });

    it('reset() 会 abort 正在跑的请求（底层 signal 变 aborted）', async () => {
      let capturedSignal: AbortSignal | undefined;
      // 用 pending 让 run 一直挂着，等 reset 打断
      const engine = makeMockEngine({
        runStreaming: undefined,
        run: (input) => {
          capturedSignal = input.signal;
          return new Promise<string>((_, reject) => {
            input.signal?.addEventListener('abort', () =>
              reject(new DOMException('reset', 'AbortError')),
            );
          });
        },
      });
      const { result } = renderHook(() => useTranslate({ engine, cache: null }));

      let pending: Promise<void>;
      act(() => {
        pending = result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      // 拿到 signal 后 reset
      await new Promise((r) => setTimeout(r, 0));
      expect(capturedSignal?.aborted).toBe(false);

      act(() => {
        result.current.reset();
      });
      expect(capturedSignal?.aborted).toBe(true);

      // 等 pending 走完 finally，别让 vitest 报未处理 promise
      await act(async () => {
        await pending!;
      });
      expect(result.current.status).toBe('idle');
    });

    it('后一个 translate 会 abort 前一个的 signal（自动去重）', async () => {
      const signals: AbortSignal[] = [];
      const engine = makeMockEngine({
        runStreaming: undefined,
        run: (input) => {
          signals.push(input.signal!);
          return new Promise<string>((resolve, reject) => {
            input.signal?.addEventListener('abort', () =>
              reject(new DOMException('superseded', 'AbortError')),
            );
            // 第二个请求快速 resolve
            if (signals.length === 2) setTimeout(() => resolve('[T] second'), 5);
          });
        },
      });
      const { result } = renderHook(() => useTranslate({ engine, cache: null }));

      let p1: Promise<void>;
      let p2: Promise<void>;
      act(() => {
        p1 = result.current.translate('first', { source: 'en', target: 'zh' });
      });
      await new Promise((r) => setTimeout(r, 0));
      act(() => {
        p2 = result.current.translate('second', { source: 'en', target: 'zh' });
      });
      await act(async () => {
        await Promise.all([p1!, p2!]);
      });

      // 第一次 signal 应该被 abort，第二次仍然有效
      expect(signals[0]!.aborted).toBe(true);
      expect(signals[1]!.aborted).toBe(false);
      expect(result.current.output).toBe('[T] second');
      expect(result.current.status).toBe('done');
    });

    it('TimeoutError 显示专门的超时文案', async () => {
      const engine = makeMockEngine({
        runStreaming: undefined,
        run: async () => {
          throw new DOMException('fetch timeout 30000ms', 'TimeoutError');
        },
      });
      const { result } = renderHook(() => useTranslate({ engine, cache: null }));
      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      expect(result.current.status).toBe('error');
      expect(result.current.error).toMatch(/超时/);
    });

    it('AbortError（非超时）静默不设置 error 状态', async () => {
      const engine = makeMockEngine({
        runStreaming: undefined,
        run: async () => {
          throw new DOMException('user cancel', 'AbortError');
        },
      });
      const { result } = renderHook(() => useTranslate({ engine, cache: null }));
      await act(async () => {
        await result.current.translate('hi', { source: 'en', target: 'zh' });
      });
      // 因为 abort 被认为是"上一个已被替代"的正常路径，UI 不切 error
      // 但 requestId 判定通常已经把状态卡在 loading —— 这里我们只断言"error 不是被 catch 分支设置的"
      expect(result.current.error).toBeNull();
    });
  });
});
