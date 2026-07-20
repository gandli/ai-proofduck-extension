import { useState, useCallback } from 'react';
import { MAX_CHARS } from '../constants';
import type { TranslateStatus } from '@hooks/useTranslate';

/**
 * SidePanel 译文输出面板
 *
 * P2-A（审计 v2）：从 App.tsx 抽出。含 5 种视觉态：
 *   - isOver: 超字数
 *   - isSameLanguage: 语言相同
 *   - loading: 骨架加载
 *   - error: 错误 + 重试按钮
 *   - output / empty: 内容 or 空态引导
 */
export interface ResultPanelProps {
  output: string;
  status: TranslateStatus;
  error: string | null;
  isOver: boolean;
  isSameLanguage: boolean;
  canTranslate: boolean;
  onRetry: () => void;
}

export function ResultPanel({
  output,
  status,
  error,
  isOver,
  isSameLanguage,
  canTranslate,
  onRetry,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // 忽略 clipboard 写入错误
    });
  }, [output]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider font-semibold text-ink-400">
        <span>译文</span>
        {/* Gemini review #508 采纳：只在实际展示译文时显示字数，
            避免 loading/error/isOver/isSameLanguage 态下泄漏上一次翻译的历史字数 */}
        {output && !isOver && !isSameLanguage && status !== 'loading' && status !== 'error' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="hover:text-ink-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-ink-400 rounded transition-colors flex items-center gap-1"
              title="复制译文"
              aria-label={copied ? "已复制" : "复制译文"}
            >
              <span aria-hidden>{copied ? '✓' : '📋'}</span>
              <span aria-live="polite" className={copied ? 'text-emerald-600' : ''}>
                {copied ? '已复制' : '复制'}
              </span>
            </button>
            <span className="font-mono normal-case tracking-normal font-normal">
              {output.length} 字
            </span>
          </div>
        )}
      </div>
      <div
        className="pd-plush-input min-h-[140px] p-3 text-sm text-ink-warm leading-relaxed font-serif whitespace-pre-wrap"
        aria-label="翻译结果"
        aria-live="polite"
        aria-busy={status === 'loading' ? 'true' : 'false'}
      >
        {isOver ? (
          <span className="text-danger font-sans text-sm not-italic" style={{ color: '#e03131' }}>
            输入超过 {MAX_CHARS} 字，请分段翻译
          </span>
        ) : isSameLanguage ? (
          <span className="text-danger font-sans text-sm not-italic" style={{ color: '#e03131' }}>
            源语言和目标语言不能相同
          </span>
        ) : status === 'loading' ? (
          /* v0.5.1 · 骨架加载：三行渐现方块，比 spinner 明确"正在生成什么" */
          <div className="pd-skeleton-group" aria-hidden>
            <div className="pd-skeleton pd-skeleton-line" style={{ width: '92%' }} />
            <div className="pd-skeleton pd-skeleton-line" style={{ width: '78%' }} />
            <div className="pd-skeleton pd-skeleton-line" style={{ width: '55%' }} />
          </div>
        ) : status === 'error' && error ? (
          /* v0.5.1 · 错误态：错误 + 显式 Retry 按钮（键盘可达） */
          <div className="flex flex-col gap-2 font-sans not-italic">
            <span className="text-danger text-sm" style={{ color: '#e03131' }}>
              ✗ {error}
            </span>
            <button
              type="button"
              onClick={onRetry}
              disabled={!canTranslate}
              className="pd-plush-retry self-start text-[12.5px] px-2.5 py-1 rounded-md border border-brand-500 text-brand-700 hover:bg-brand-50 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 disabled:opacity-50"
            >
              重试
            </button>
          </div>
        ) : output ? (
          output
        ) : (
          /* v0.5.1 · 空状态：加"下一步"引导，比孤伶的一句更实用 */
          <div className="text-ink-400 font-sans text-sm">
            <div className="italic mb-2">翻译结果会显示在这里…</div>
            <div className="text-[12px] not-italic text-ink-500 leading-6">
              <div>· 粘贴或输入文本到上方</div>
              <div>
                · 按{' '}
                <kbd className="font-mono text-[11px] px-1 py-0.5 rounded border border-ink-300">
                  ⌘/Ctrl
                </kbd>{' '}
                +{' '}
                <kbd className="font-mono text-[11px] px-1 py-0.5 rounded border border-ink-300">
                  ↵
                </kbd>{' '}
                快速翻译
              </div>
              <div>· 选中网页文字，弹泡也会自动翻译</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
