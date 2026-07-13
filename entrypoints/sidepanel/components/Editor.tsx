import { Button } from '@components/Button';
import { MAX_CHARS } from '../constants';
import type { TranslateStatus } from '@hooks/useTranslate';

/**
 * SidePanel 原文输入 + CTA 按钮组
 *
 * P2-A（审计 v2）：从 App.tsx 抽出。纯受控 + 事件回调，不含引擎逻辑。
 */
export interface EditorProps {
  text: string;
  onTextChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  charCount: number;
  isOver: boolean;
  status: TranslateStatus;
  canTranslate: boolean;
  onTranslate: () => void;
  onClear: () => void;
}

export function Editor({
  text,
  onTextChange,
  onKeyDown,
  charCount,
  isOver,
  status,
  canTranslate,
  onTranslate,
  onClear,
}: EditorProps) {
  return (
    <>
      {/* 原文输入 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider font-semibold text-ink-400">
          <label htmlFor="source-text">原文</label>
          <span
            className={`font-mono normal-case tracking-normal ${
              isOver ? 'text-danger font-semibold' : 'font-normal'
            }`}
            style={isOver ? { color: '#e03131' } : undefined}
            aria-live="polite"
          >
            {charCount} / {MAX_CHARS}
          </span>
        </div>
        <textarea id="source-text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="在这里粘贴要翻译的文本…（⌘/Ctrl + ↵ 快速翻译）"
          className="pd-plush-input w-full min-h-[140px] p-3 text-sm resize-y text-ink-800 leading-relaxed focus:outline-none"
        />
      </div>

      {/* CTA */}
      <div className="flex gap-2 items-center">
        <Button variant="primary" onClick={onTranslate} disabled={!canTranslate}>
          {status === 'loading' ? (
            <>
              <span aria-hidden className="pd-btn-dot" />
              <span>翻译中…</span>
            </>
          ) : (
            <>
              <span>翻译</span>
              <span
                className="font-mono text-[10.5px] px-1.5 py-0.5 rounded border border-ink-800/25 bg-white/40 text-ink-800 font-medium ml-1"
                aria-hidden
              >
                ⌘↵
              </span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          disabled={!text}
          title={!text ? '没有可清空的内容' : '清空输入和翻译结果'}
          onClick={onClear}
        >
          清空
        </Button>
      </div>
    </>
  );
}
