import { memo } from 'react';
import type { Engine } from '@engines/types';

/**
 * SidePanel 顶部品牌 header + 引擎就绪状态 + 无引擎横幅
 *
 * P2-A（审计 v2）：从 App.tsx 抽出，仅负责状态可视化，不含业务逻辑。
 * 输入：resolvedEngine（当前使用的引擎）+ available（就绪状态 tri-state）
 * 输出：header + 引擎徽章 + （若无可用引擎）guidance 横幅
 */
export interface EngineStatusProps {
  resolvedEngine: Engine | null;
  /** 三态：true=就绪 / false=不可用 / null=检测中 */
  available: boolean | null;
}

// ⚡ Bolt: Memoize EngineStatus to prevent re-renders when parent text state changes.
// Impact: Avoids unnecessary layout recalculations for the header area on every keystroke.
export const EngineStatus = memo(function EngineStatus({ resolvedEngine, available }: EngineStatusProps) {
  return (
    <>
      <header className="pd-plush-sky px-4 pt-4 pb-3 border-b border-brand-100">
        <div className="flex items-center gap-3">
          <span className="pd-plush-logo-wrap" aria-hidden>
            <img src="/icons/icon-32.png" alt="" />
          </span>
          <div className="flex flex-col">
            <h1 className="text-base font-bold font-serif text-ink-900 tracking-tight">
              校对鸭
            </h1>
            <p className="text-[11px] text-ink-500 mt-0.5">你的贴心写作小助手</p>
          </div>
        </div>

        {/* 引擎徽章 + 就绪概览：让用户知道谁在干活。
            Gemini review: 用 available === true 而非 !== false，
            避免检测未完成时闪现"就绪"再突然报错 */}
        {resolvedEngine && available === true && (
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span data-testid="engine-chip" className="pd-plush-chip">
              <span className="pd-dot pd-dot-ok" style={{ width: 6, height: 6 }} />
              {resolvedEngine.name}
            </span>
          </div>
        )}
      </header>

      {available === false && (
        <div className="p-4 pb-0">
          <div
            className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-ink-800 space-y-1"
            style={{ background: '#fff5f5', borderColor: 'rgba(224,49,49,0.3)' }}
            role="alert"
          >
            <div className="font-semibold text-danger" style={{ color: '#e03131' }}>
              没有可用引擎
            </div>
            <div className="text-ink-700 text-[13px]">
              请去
              <a
                href="options.html"
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 underline text-brand-700 font-medium"
                style={{ color: '#a56501' }}
              >
                设置页
              </a>
              配置 OpenAI 兼容 API，或启用免费翻译兜底。
            </div>
            <div className="text-[11.5px] text-ink-500">
              也可升级到 Chrome 138+ 并在{' '}
              <code className="mx-0.5 px-1 bg-ink-100 rounded text-[11px] font-mono">
                chrome://flags
              </code>
              启用 "Translation API" 用本地 AI。
            </div>
          </div>
        </div>
      )}
    </>
  );
});
