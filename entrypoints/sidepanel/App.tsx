/**
 * SidePanel App (M2 Cycle 4c): 双栏翻译主战场，引擎自动兜底
 *
 * 布局：
 *   ┌ 品牌 header ─────────────────┐
 *   │ 校对鸭 · 侧边栏               │
 *   │ 引擎徽章：xxx                 │
 *   ├─── (无可用引擎时) 提示横幅 ─┤
 *   ├── 目标语言 selector ─────────┤
 *   ├── 输入 textarea ─────────────┤
 *   ├── [翻译] [清空] ──────────────┤
 *   └── 输出结果（流式渲染） ───────┘
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
  isAvailable: async () => false,
  supports: () => false,
  run: async () => '',
};

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
      // 测试注入路径：直接用
      setResolvedEngine(engine);
      setIsResolving(false);
      return;
    }
    // 生产路径：走 pickBest() 兜底
    let cancelled = false;
    setIsResolving(true);
    getEngines()
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
      setAvailable(false);
      return;
    }
    resolvedEngine.isAvailable().then(setAvailable).catch(() => setAvailable(false));
  }, [resolvedEngine, isResolving]);

  // 同语言校验：手动选定的源和目标一样时无意义（'auto' 例外，由引擎自行推断）
  const isSameLanguage = source !== 'auto' && source === target;
  const canTranslate =
    text.trim().length > 0 && status !== 'loading' && available !== false && !isSameLanguage;

  const handleTranslate = () => {
    // 'auto' → 让引擎自己推断；chrome-ai 目前需要显式 source，暂用启发式：中→英，其他→中
    const src = source === 'auto' ? (target === 'zh' ? 'en' : 'zh') : source;
    translate(text, { source: src, target });
  };

  return (
    <div className="min-h-screen p-4 space-y-3 bg-white text-slate-900">
      <header className="flex items-center gap-2">
        <img src="/icons/icon-32.png" alt="" className="w-6 h-6" />
        <h1 className="text-lg font-semibold">校对鸭 · 侧边栏</h1>
      </header>

      {/* 引擎徽章：让用户知道谁在干活 */}
      {resolvedEngine && available !== false && (
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <span>引擎：</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            {resolvedEngine.name}
          </span>
        </div>
      )}

      {available === false && (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 space-y-1"
          role="alert"
        >
          <div className="font-medium">没有可用引擎</div>
          <div>
            请去
            <a
              href="options.html"
              target="_blank"
              rel="noreferrer"
              className="mx-1 underline text-amber-900"
            >
              设置页
            </a>
            配置 OpenAI 兼容 API，或启用免费翻译兜底。
          </div>
          <div className="text-xs text-amber-700">
            也可升级到 Chrome 138+ 并在{' '}
            <code className="mx-0.5 px-1 bg-amber-100 rounded">chrome://flags</code>
            启用 "Translation API" 用本地 AI。
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="target-lang" className="text-slate-600">
          目标语言
        </label>
        <select
          id="target-lang"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
          aria-label="目标语言"
        >
          {TARGET_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <label htmlFor="source-lang" className="ml-3 text-slate-600">
          源语言
        </label>
        <select
          id="source-lang"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
          aria-label="源语言"
        >
          <option value="auto">自动</option>
          {TARGET_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在这里粘贴要翻译的文本…"
        className="w-full min-h-[160px] rounded-md border border-slate-300 p-2 text-sm resize-y"
      />

      <div className="flex gap-2">
        <Button variant="primary" onClick={handleTranslate} disabled={!canTranslate}>
          {status === 'loading' ? '翻译中…' : '翻译'}
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

      {/* 输出区：即使 output 为空也保留结构，方便流式填字 */}
      <div
        className="min-h-[120px] rounded-md border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap"
        aria-label="翻译结果"
        aria-live="polite"
      >
        {isSameLanguage ? (
          <span className="text-amber-600">源语言和目标语言不能相同</span>
        ) : status === 'error' && error ? (
          <span className="text-rose-600">✗ {error}</span>
        ) : output ? (
          output
        ) : (
          <span className="text-slate-400">翻译结果会显示在这里…</span>
        )}
      </div>
    </div>
  );
}
