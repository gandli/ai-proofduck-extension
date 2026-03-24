import { toEngineBadge } from '../../shared/engine-display';

interface ResultPanelProps {
  title: string;
  result: string;
  notice?: string;
  isLoading?: boolean;
  progressText?: string;
  onClear: () => void;
}

function toEngineTag(notice?: string) {
  return toEngineBadge(notice);
}

export function ResultPanel({ title, result, notice, isLoading = false, progressText = '', onClear }: ResultPanelProps) {
  const engineTag = toEngineTag(notice);

  return (
    <section data-proofduck-result-panel="true" className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 data-proofduck-result-title="true" className="text-sm font-bold text-slate-700">
            {title}
          </h2>
          {engineTag ? (
            <span data-proofduck-result-engine="true" className="text-[11px] font-medium text-[#c45a1a]">
              {engineTag}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{result.length} 字</span>
          <button
            type="button"
            onClick={onClear}
            disabled={!result}
            className="rounded-full border border-[#ffd9c8] bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
          >
            清空
          </button>
        </div>
      </div>
      <div className="min-h-[13rem] h-[37vh] max-h-[52vh] flex-1 resize-y overflow-auto rounded-[1.15rem] border-2 border-[#ff8a57] bg-white p-3.5 text-sm leading-7 text-slate-600 shadow-[0_10px_26px_rgba(255,90,17,0.08)] transition duration-300">
        {isLoading ? (
          <div className="pd-fade-up flex h-full flex-col justify-start gap-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[#c45a1a]">
              <span className="h-2 w-2 rounded-full bg-brand-orange pd-soft-pulse" />
              <span>{progressText || '正在生成结果'}</span>
            </div>
            <div className="pd-shimmer pd-skeleton-line h-4 w-[78%]" />
            <div className="pd-shimmer pd-skeleton-line h-4 w-full" />
            <div className="pd-shimmer pd-skeleton-line h-4 w-[92%]" />
            <div className="pd-shimmer pd-skeleton-line h-4 w-[68%]" />
            <div className="pd-shimmer pd-skeleton-line h-4 w-[84%]" />
          </div>
        ) : (
          <div data-proofduck-result-text="true" className={`whitespace-pre-wrap ${result ? 'pd-result-enter' : ''}`}>
            {result || 'Result will appear here.'}
          </div>
        )}
      </div>
    </section>
  );
}
