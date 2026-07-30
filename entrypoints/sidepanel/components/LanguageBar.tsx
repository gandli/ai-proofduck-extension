import { memo } from 'react';
import { TARGET_LANGS } from '../constants';
import { ArrowLeftRight } from 'lucide-react';

/**
 * SidePanel 语言选择栏（3 列 · 源 / 交换 / 目标）
 *
 * P2-A（审计 v2）：从 App.tsx 抽出。纯受控组件，通过回调告知状态变更。
 */
export interface LanguageBarProps {
  source: string;
  target: string;
  onSourceChange: (v: string) => void;
  onTargetChange: (v: string) => void;
  onSwap: () => void;
}

// ⚡ Bolt: Memoize LanguageBar to prevent unnecessary re-renders on keystrokes in Editor.
// Impact: Reduces React rendering workload during typing, keeping the input responsive.
export const LanguageBar = memo(function LanguageBar({
  source,
  target,
  onSourceChange,
  onTargetChange,
  onSwap,
}: LanguageBarProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="source-lang"
          className="text-[10.5px] uppercase text-ink-400 font-semibold"
        >
          源语言
        </label>
        <select
          id="source-lang"
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          className="pd-plush-select px-2.5 py-2 text-sm text-ink-800 focus:outline-none cursor-pointer"
          aria-label="源语言"
        >
          <option value="auto">自动检测</option>
          {TARGET_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onSwap}
        disabled={source === 'auto'}
        title={source === 'auto' ? '自动检测源语言时无法交换' : '交换语言方向'}
        aria-label="交换语言方向"
        className="pd-plush-swap flex items-center justify-center"
      >
        <ArrowLeftRight
          size={14}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="target-lang"
          className="text-[10.5px] uppercase text-ink-400 font-semibold"
        >
          目标语言
        </label>
        <select
          id="target-lang"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
          className="pd-plush-select px-2.5 py-2 text-sm text-ink-800 focus:outline-none cursor-pointer"
          aria-label="目标语言"
        >
          {TARGET_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});
