/**
 * useTranslate: 流式翻译状态管理 hook
 *
 * 职责：
 * - 把 Engine.runStreaming 的 chunk 流累积成 output
 * - 统一状态机：idle → loading → done | error
 * - 引擎无流式能力时降级到 run() 一次性调用
 * - 依赖注入 engine（方便测试 + 未来切换引擎）
 *
 * 为什么把 engine 作为参数而不是内部单例？
 * - 测试时可以喂 mock
 * - UI 层可以根据 settings 里 defaultEngine 挑不同的
 */
import { useCallback, useState } from 'react';
import type { Engine } from '@engines/types';

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
}

export function useTranslate({ engine }: UseTranslateOptions): UseTranslateResult {
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<TranslateStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (text: string, opts: { source: string; target: string }) => {
      setOutput('');
      setError(null);
      setStatus('loading');

      try {
        if (engine.runStreaming) {
          let acc = '';
          for await (const chunk of engine.runStreaming({
            mode: 'translate',
            text,
            sourceLang: opts.source,
            targetLang: opts.target,
          })) {
            acc += chunk;
            setOutput(acc);
          }
        } else {
          const result = await engine.run({
            mode: 'translate',
            text,
            sourceLang: opts.source,
            targetLang: opts.target,
          });
          setOutput(result);
        }
        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [engine],
  );

  const reset = useCallback(() => {
    setOutput('');
    setError(null);
    setStatus('idle');
  }, []);

  return { output, status, error, translate, reset };
}
