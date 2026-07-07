/**
 * fetch-abort 单元测试
 * 覆盖 v0.5.3 P0-1 修复的核心工具函数
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFetchAbortHandle,
  isAbortError,
  isTimeoutError,
  DEFAULT_FETCH_TIMEOUT_MS,
} from '@utils/fetch-abort';

describe('createFetchAbortHandle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('无 userSignal 时返回可被超时触发的 signal', () => {
    const h = createFetchAbortHandle(undefined, 1000);
    expect(h.signal.aborted).toBe(false);

    vi.advanceTimersByTime(999);
    expect(h.signal.aborted).toBe(false);

    vi.advanceTimersByTime(2);
    expect(h.signal.aborted).toBe(true);
    expect((h.signal.reason as DOMException).name).toBe('TimeoutError');

    h.cleanup();
  });

  it('cleanup() 清 timer 后不再触发超时 abort', () => {
    const h = createFetchAbortHandle(undefined, 1000);
    h.cleanup();
    vi.advanceTimersByTime(5000);
    expect(h.signal.aborted).toBe(false);
  });

  it('userSignal 已 abort 时合成 signal 立即为 aborted', () => {
    const user = new AbortController();
    user.abort(new DOMException('user cancel', 'AbortError'));

    const h = createFetchAbortHandle(user.signal, 1000);
    expect(h.signal.aborted).toBe(true);
    h.cleanup();
  });

  it('userSignal 中途 abort 也会传导到合成 signal', () => {
    const user = new AbortController();
    const h = createFetchAbortHandle(user.signal, 5000);
    expect(h.signal.aborted).toBe(false);

    user.abort(new DOMException('user cancel', 'AbortError'));
    expect(h.signal.aborted).toBe(true);
    h.cleanup();
  });

  it('默认超时为 30s', () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(30_000);
  });

  // v0.5.5 P3-C（审计 v3 tail）：fetch-abort.ts L56-68 · AbortSignal.any 缺失时降级路径
  // Node 20+ 有 AbortSignal.any 原生实现，正常路径 L53 anyFn 分支覆盖；
  // 生产也可能跑在没 AbortSignal.any 的老环境（旧 Safari / Node <19），
  // 需专门 stub 强制走 L56-68 手动 addEventListener 转发降级
  describe('AbortSignal.any 不可用时的降级路径', () => {
    let originalAny: unknown;

    beforeEach(() => {
      originalAny = (AbortSignal as unknown as { any?: unknown }).any;
      // 强制走手动 forward 降级
      (AbortSignal as unknown as { any?: unknown }).any = undefined;
    });

    afterEach(() => {
      (AbortSignal as unknown as { any?: unknown }).any = originalAny;
    });

    it('userSignal 未 abort → 走 addEventListener 转发', () => {
      const user = new AbortController();
      const h = createFetchAbortHandle(user.signal, 5000);
      try {
        expect(h.signal.aborted).toBe(false);
        user.abort(new DOMException('user cancel', 'AbortError'));
        expect(h.signal.aborted).toBe(true);
      } finally {
        // Gemini review 采纳：try/finally 防定时器泄漏（fake timers 环境下尤其重要）
        h.cleanup();
      }
    });

    it('userSignal 已 abort → 降级立即触发 timeoutCtl.abort + clearTimeout', () => {
      const user = new AbortController();
      user.abort(new DOMException('user cancel', 'AbortError'));
      const h = createFetchAbortHandle(user.signal, 5000);
      try {
        expect(h.signal.aborted).toBe(true);
      } finally {
        h.cleanup();
      }
    });

    it('无 userSignal → combined = timeoutCtl.signal 分支', () => {
      const h = createFetchAbortHandle(undefined, 100);
      try {
        expect(h.signal.aborted).toBe(false);
        vi.advanceTimersByTime(101);
        expect(h.signal.aborted).toBe(true);
      } finally {
        h.cleanup();
      }
    });
  });
});

describe('isAbortError / isTimeoutError', () => {
  it('AbortError DOMException 为 abort、非 timeout', () => {
    const err = new DOMException('cancel', 'AbortError');
    expect(isAbortError(err)).toBe(true);
    expect(isTimeoutError(err)).toBe(false);
  });

  it('TimeoutError DOMException 既是 abort 又是 timeout', () => {
    const err = new DOMException('timeout', 'TimeoutError');
    expect(isAbortError(err)).toBe(true);
    expect(isTimeoutError(err)).toBe(true);
  });

  it('普通 Error 都不是', () => {
    const err = new Error('boom');
    expect(isAbortError(err)).toBe(false);
    expect(isTimeoutError(err)).toBe(false);
  });

  it('鸭子类型 { name: "AbortError" } 也识别', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError({ name: 'TimeoutError' })).toBe(true);
    expect(isTimeoutError({ name: 'TimeoutError' })).toBe(true);
  });

  it('null / undefined / 非对象 都不崩', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('string')).toBe(false);
    expect(isAbortError(42)).toBe(false);
  });
});
