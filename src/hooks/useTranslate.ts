/**
 * useTranslate: 流式翻译状态管理 hook
 *
 * 职责：
 * - 把 Engine.runStreaming 的 chunk 流累积成 output
 * - 统一状态机：idle → loading → done | error
 * - 引擎无流式能力时降级到 run() 一次性调用
 * - 依赖注入 engine（方便测试 + 未来切换引擎）
 * - 竞态保护：反复触发 translate 时旧请求不会覆盖新状态
 *
 * 为什么把 engine 作为参数而不是内部单例？
 * - 测试时可以喂 mock
 * - UI 层可以根据 settings 里 defaultEngine 挑不同的
 *
 * 注意：引擎「可用性」检查不在 hook 里做，交给 UI 层（挂载时调 engine.isAvailable()）。
 * hook 只负责调用 engine 时的错误捕获——engine 内部抛错会走到 status='error'。
 */
import { useCallback, useRef, useState } from 'react';
import type { Engine } from '@engines/types';
import { formatErrorMessage } from '@utils/error';
import { TranslationCache, makeCacheKey } from '@utils/cache';

export type TranslateStatus = 'idle' | 'loading' | 'done' | 'error';

export interface UseTranslateResult {
  output: string;
  status: TranslateStatus;
  error: string | null;
  translate: (text: string, opts: { source: string; target: string }) => Promise<void>;
  reset: () => void;
}

export interface UseTranslateOptions {
  engine: Engine;
  /**
   * 可注入缓存实例；默认使用全局共享的缓存（跨 hook 实例复用）。
   * 传 null 可禁用缓存（测试或用户显式关闭时使用）。
   */
  cache?: TranslationCache | null;
}

// 全局默认缓存：整个扩展生命周期内的翻译结果共享
const defaultCache = new TranslationCache();

export function useTranslate({ engine, cache }: UseTranslateOptions): UseTranslateResult {
  // undefined = 用默认；null = 显式禁用；否则用注入的
  const activeCache = cache === undefined ? defaultCache : cache;

  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<TranslateStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  // 竞态保护：每次触发 translate/reset 时递增，异步回调用 requestId !== current 判断作废
  // 场景：用户快速反复点翻译；或流式尚未结束就 reset
  const activeRequestIdRef = useRef(0);

  const translate = useCallback(
    async (text: string, opts: { source: string; target: string }) => {
      const requestId = ++activeRequestIdRef.current;
      setOutput('');
      setError(null);
      setStatus('loading');

      // ⚡ 缓存命中路径：直接返回，跳过引擎
      // key 组装用 makeCacheKey 保证：mode + 语言对 + 文本 一致就命中
      const cacheKey = makeCacheKey({
        mode: 'translate',
        text,
        sourceLang: opts.source,
        targetLang: opts.target,
      });
      const cached = activeCache?.get(cacheKey);
      if (cached !== undefined) {
        if (requestId !== activeRequestIdRef.current) return;
        setOutput(cached);
        setStatus('done');
        return;
      }

      try {
        let finalText = '';
        if (engine.runStreaming) {
          let acc = '';
          for await (const chunk of engine.runStreaming({
            mode: 'translate',
            text,
            sourceLang: opts.source,
            targetLang: opts.target,
          })) {
            // 中途被新请求或 reset 取代 → 停止吐字
            if (requestId !== activeRequestIdRef.current) return;
            acc += chunk;
            setOutput(acc);
          }
          finalText = acc;
        } else {
          const result = await engine.run({
            mode: 'translate',
            text,
            sourceLang: opts.source,
            targetLang: opts.target,
          });
          if (requestId !== activeRequestIdRef.current) return;
          setOutput(result);
          finalText = result;
        }
        if (requestId !== activeRequestIdRef.current) return;
        setStatus('done');
        // 只有成功且请求仍然有效才写缓存（避免污染）
        if (finalText) activeCache?.set(cacheKey, finalText);
      } catch (err) {
        // 已经作废的请求出错也别覆盖新状态
        if (requestId !== activeRequestIdRef.current) return;
        setError(formatErrorMessage(err, '翻译失败'));
        setStatus('error');
      }
    },
    [engine, activeCache],
  );

  const reset = useCallback(() => {
    // 递增让正在跑的请求整个作废
    activeRequestIdRef.current++;
    setOutput('');
    setError(null);
    setStatus('idle');
  }, []);

  return { output, status, error, translate, reset };
}
