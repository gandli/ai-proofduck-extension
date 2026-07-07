/**
 * fetch-with-timeout: 给所有 engine 的 fetch 加统一的中断能力
 *
 * v0.5.3 · 修 P0-1（审计 fuck-my-shit-mountain 报告）：
 * 原本所有 fetch 无 signal 无 timeout，服务端 hang 住时 UI 永远 loading。
 *
 * 组合两条中断源：
 *   1. userSignal —— 用户主动取消（reset() / 新翻译请求）
 *   2. 内部 30s timeout —— 用户忘了传或忘了取消时的兜底
 *
 * 用 AbortSignal.any（Chrome 116+ / Safari 17.4+ / Firefox 124+）合成一个新 signal。
 * 老浏览器不支持时降级到"只用 timeout signal"（丢失 userSignal 联动）。
 *
 * timeout 计时器在返回的 cleanup() 里 clearTimeout，避免 fetch 完成后 timer 空跑到 30s。
 */

/** 默认单次请求最大等待时长 —— 兼顾 SSE 首 chunk 迟到与 API cold start */
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

export interface FetchAbortHandle {
  /** 合成后的 signal，直接传给 fetch({ signal }) */
  signal: AbortSignal;
  /** fetch 结束后（不管成功失败）必须调用，清 timeout timer */
  cleanup: () => void;
}

/**
 * 构造一个"用户信号 ∪ 超时信号"的合成 AbortSignal。
 *
 * 用法：
 *   const h = createFetchAbortHandle(input.signal);
 *   try {
 *     const resp = await fetch(url, { signal: h.signal });
 *     ...
 *   } finally {
 *     h.cleanup();
 *   }
 */
export function createFetchAbortHandle(
  userSignal: AbortSignal | undefined,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): FetchAbortHandle {
  const timeoutCtl = new AbortController();
  const timer = setTimeout(() => {
    // reason 会作为 AbortError 的 reason 字段透出给 catch，UI 可以 pattern-match
    timeoutCtl.abort(new DOMException(`fetch timeout ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  // AbortSignal.any 是新 API；老浏览器降级到只用 timeout signal
  const anyFn = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  let combined: AbortSignal;
  if (typeof anyFn === 'function' && userSignal) {
    combined = anyFn.call(AbortSignal, [userSignal, timeoutCtl.signal]);
  } else if (userSignal) {
    // 降级：手动 forward userSignal.abort → timeoutCtl.abort
    if (userSignal.aborted) {
      clearTimeout(timer);
      timeoutCtl.abort(userSignal.reason);
    } else {
      userSignal.addEventListener(
        'abort',
        () => {
          timeoutCtl.abort(userSignal.reason);
        },
        { once: true },
      );
    }
    combined = timeoutCtl.signal;
  } else {
    combined = timeoutCtl.signal;
  }

  return {
    signal: combined,
    cleanup: () => clearTimeout(timer),
  };
}

/**
 * 判断错误是否为 abort 类（用户取消 or 超时）
 * 用于 UI 区分 "网络挂了" vs "用户主动取消"，前者要给重试 CTA、后者静默。
 */
export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === 'AbortError' || err.name === 'TimeoutError';
  }
  if (typeof err === 'object' && err !== null && 'name' in err) {
    const name = (err as { name?: unknown }).name;
    return name === 'AbortError' || name === 'TimeoutError';
  }
  return false;
}

/** 判断错误是否为超时（用于 UI 给"请求超时，请重试"的针对性文案） */
export function isTimeoutError(err: unknown): boolean {
  if (err instanceof DOMException) return err.name === 'TimeoutError';
  if (typeof err === 'object' && err !== null && 'name' in err) {
    return (err as { name?: unknown }).name === 'TimeoutError';
  }
  return false;
}
