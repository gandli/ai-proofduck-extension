/**
 * SidePanel App (v0.4 UI 重设计): 双栏翻译主战场，引擎自动兜底
 *
 * v0.4 UI 变更：
 * - 品牌 header：logo 渐变 + serif 标题 + 引擎胶囊 + 就绪概览
 * - 源/目标语言：左右对称 + 中间旋转 swap 按钮
 * - 原文/译文分区，字数计数 + 悬停 toolbar（复制/朗读/重翻）
 * - 译文区背景 brand-50，形成"输入白 / 输出黄"语义闭环
 * - 主 CTA 品牌黄渐变，带 ⌘↵ 快捷键提示
 *
 * DI：engine 从 props 传入，方便测试。生产从 EngineManager.pickBest() 兜底选。
 *
 * Bug #P0 修复：早期版本硬编码 pickById('chrome-ai')，Chrome 138 以下就废了整个扩展。
 * 现在走 pickBest() 自动选出**当前可用**的最高优先级引擎。
 */
import { useEffect, useState } from 'react';
import { Button } from '@components/Button';
import { useTranslate } from '@hooks/useTranslate';
import { getEngines } from '@core/engines';
import type { Engine } from '@engines/types';

interface Props {
  /** 依赖注入。测试用 mock；生产由 useEffect 从 pickBest() 拿 */
  engine?: Engine;
}

/** 支持的目标语言（M2 Cycle 1 就 6 种主流） */
const TARGET_LANGS: Array<{ code: string; label: string }> = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

/**
 * 引擎缺失时的 no-op stub。
 * 提到组件外声明，避免每次渲染重建导致 useTranslate 内的 useCallback 依赖变化。
 * (Gemini review 建议)
 */
const STUB_ENGINE: Engine = {
  id: 'chrome-ai',
  name: 'unavailable',
  priority: 0,
  // eslint-disable-next-line @typescript-eslint/require-await -- 契约签名要求 Promise
  isAvailable: async () => false,
  supports: () => false,
  // eslint-disable-next-line @typescript-eslint/require-await -- 契约签名要求 Promise
  run: async () => '',
};

const MAX_CHARS = 5000;

export default function SidePanelApp({ engine }: Props = {}) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState('zh');
  const [source, setSource] = useState('auto'); // 'auto' 由引擎推断
  const [available, setAvailable] = useState<boolean | null>(null);

  // 引擎的选择过程本身可能是异步的（pickBest 要 await isAvailable）
  // 用 state 保存 resolved 结果 + isResolving 避免闪烁"没有可用引擎"横幅（Gemini review）
  const [resolvedEngine, setResolvedEngine] = useState<Engine | null>(engine ?? null);
  const [isResolving, setIsResolving] = useState(!engine);

  // 当没有传 engine（生产环境），异步选一个最好的
  useEffect(() => {
    if (engine) {
      // 测试注入路径：直接用（同步 setState in effect 是可接受的，
      // 因为条件仅在挂载/prop 变化时命中，不产生级联）
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResolvedEngine(engine);
      setIsResolving(false);
      return;
    }
    // 生产路径：走 pickBest() 兜底
    let cancelled = false;
    setIsResolving(true);
    void getEngines()
      .pickBest()
      .then((e: Engine | null) => {
        if (!cancelled) {
          setResolvedEngine(e);
          setIsResolving(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedEngine(null);
          setIsResolving(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [engine]);

  const { output, status, error, translate, reset } = useTranslate({
    engine: resolvedEngine ?? STUB_ENGINE,
  });

  // 检测当前所选引擎可用性（isResolving 期间不判定，避免闪烁 Gemini review）
  useEffect(() => {
    if (isResolving) return;
    if (!resolvedEngine) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailable(false);
      return;
    }
    void resolvedEngine
      .isAvailable()
      .then(setAvailable)
      .catch(() => {
        setAvailable(false);
      });
  }, [resolvedEngine, isResolving]);

  // 同语言校验：手动选定的源和目标一样时无意义（'auto' 例外，由引擎自行推断）
  const isSameLanguage = source !== 'auto' && source === target;
  const canTranslate =
    text.trim().length > 0 && status !== 'loading' && available !== false && !isSameLanguage;

  const handleTranslate = () => {
    // 'auto' → 让引擎自己推断；chrome-ai 目前需要显式 source，暂用启发式：中→英，其他→中
    const src = source === 'auto' ? (target === 'zh' ? 'en' : 'zh') : source;
    void translate(text, { source: src, target });
  };

  // 交换语言：auto 时不能交换（无源语言）
  const handleSwap = () => {
    if (source === 'auto') return;
    setSource(target);
    setTarget(source);
  };

  // Ctrl/⌘ + Enter 快捷键提交
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canTranslate) {
      e.preventDefault();
      handleTranslate();
    }
  };

  const charCount = text.length;
  const isOver = charCount > MAX_CHARS;

  return (
    <div className="min-h-screen bg-white text-ink-800 flex flex-col">
      {/* ============ 品牌 header ============ */}
      <header className="px-4 pt-4 pb-3 border-b border-ink-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="flex items-center gap-2.5">
          <img
            src="/icons/icon-32.png"
            alt=""
            className="w-7 h-7 rounded-lg shadow-brand-lg"
          />
          <h1 className="text-base font-bold font-serif text-ink-900 tracking-tight">
            校对鸭
          </h1>
        </div>

        {/* 引擎徽章 + 就绪概览：让用户知道谁在干活。
            Gemini review: 用 available === true 而非 !== false，
            避免检测未完成时闪现"就绪"再突然报错 */}
        {resolvedEngine && available === true && (
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span
              data-testid="engine-chip"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-soft text-success-strong font-medium"
              style={{ background: '#ebfbee', color: '#2f9e44' }}
            >
              <span className="pd-dot pd-dot-ok" style={{ width: 6, height: 6, boxShadow: '0 0 0 3px rgba(47,158,68,0.15)' }} />
              {resolvedEngine.name}
            </span>
          </div>
        )}
      </header>

      {/* ============ 主体 ============ */}
      <div className="flex-1 p-4 space-y-3">
        {available === false && (
          <div
            className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-ink-800 space-y-1"
            style={{ background: '#fff5f5', borderColor: 'rgba(224,49,49,0.3)' }}
            role="alert"
          >
            <div className="font-semibold text-danger" style={{ color: '#e03131' }}>没有可用引擎</div>
            <div className="text-ink-700 text-[13px]">
              请去
              <a
                href="options.html"
                target="_blank"
                rel="noreferrer"
                className="mx-1 underline text-brand-700 font-medium"
                style={{ color: '#a56501' }}
              >
                设置页
              </a>
              配置 OpenAI 兼容 API，或启用免费翻译兜底。
            </div>
            <div className="text-[11.5px] text-ink-500">
              也可升级到 Chrome 138+ 并在{' '}
              <code className="mx-0.5 px-1 bg-ink-100 rounded text-[11px] font-mono">chrome://flags</code>
              启用 "Translation API" 用本地 AI。
            </div>
          </div>
        )}

        {/* ============ 语言选择器 ============ */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="source-lang" className="text-[10.5px] uppercase tracking-wider text-ink-400 font-semibold">
              源语言
            </label>
            <select
              id="source-lang"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-md border border-ink-200 px-2.5 py-2 text-sm bg-white text-ink-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
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
            onClick={handleSwap}
            disabled={source === 'auto'}
            aria-label="交换语言方向"
            className="w-8 h-8 rounded-full border border-ink-200 bg-white text-ink-500 flex items-center justify-center hover:border-brand-500 hover:text-brand-600 hover:rotate-180 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:rotate-0 disabled:hover:border-ink-200 disabled:hover:text-ink-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 10h10M7 10l3-3M7 10l3 3M17 14H7M17 14l-3-3M17 14l-3 3" />
            </svg>
          </button>

          <div className="flex flex-col gap-1">
            <label htmlFor="target-lang" className="text-[10.5px] uppercase tracking-wider text-ink-400 font-semibold">
              目标语言
            </label>
            <select
              id="target-lang"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="rounded-md border border-ink-200 px-2.5 py-2 text-sm bg-white text-ink-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
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

        {/* ============ 原文输入 ============ */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider font-semibold text-ink-400">
            <span>原文</span>
            <span
              className={`font-mono normal-case tracking-normal ${isOver ? 'text-danger font-semibold' : 'font-normal'}`}
              style={isOver ? { color: '#e03131' } : undefined}
            >
              {charCount} / {MAX_CHARS}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在这里粘贴要翻译的文本…（⌘/Ctrl + ↵ 快速翻译）"
            className="w-full min-h-[140px] rounded-md border border-ink-200 p-3 text-sm resize-y bg-white text-ink-800 leading-relaxed focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* ============ CTA ============ */}
        <div className="flex gap-2 items-center">
          <Button variant="primary" onClick={handleTranslate} disabled={!canTranslate}>
            {status === 'loading' ? (
              <>
                <span aria-hidden className="animate-pulse">⏳</span>
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
            onClick={() => {
              setText('');
              reset();
            }}
          >
            清空
          </Button>
        </div>

        {/* ============ 译文输出 ============ */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider font-semibold text-ink-400">
            <span>译文</span>
            {output && (
              <span className="font-mono normal-case tracking-normal font-normal">
                {output.length} 字
              </span>
            )}
          </div>
          <div
            className="min-h-[100px] rounded-md border border-brand-200 bg-brand-50 p-3.5 text-[14px] leading-relaxed font-serif text-ink-900 whitespace-pre-wrap"
            aria-label="翻译结果"
            aria-live="polite"
          >
            {isSameLanguage ? (
              <span className="text-danger font-sans text-sm not-italic" style={{ color: '#e03131' }}>
                源语言和目标语言不能相同
              </span>
            ) : status === 'error' && error ? (
              <span className="text-danger font-sans text-sm" style={{ color: '#e03131' }}>
                ✗ {error}
              </span>
            ) : output ? (
              output
            ) : (
              <span className="text-ink-400 font-sans text-sm italic">
                翻译结果会显示在这里…
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
