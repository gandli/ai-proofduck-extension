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
});
