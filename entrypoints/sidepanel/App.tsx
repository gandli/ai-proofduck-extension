/**
 * SidePanel App (M2 Cycle 1): 双栏翻译主战场
 *
 * 布局：
 *   ┌ 品牌 header ─────────────────┐
 *   │ 校对鸭 · 侧边栏               │
 *   ├─── (不可用时) 提示横幅 ─────┤
 *   ├── 目标语言 selector ─────────┤
 *   ├── 输入 textarea ─────────────┤
 *   ├── [翻译] [清空] ──────────────┤
 *   └── 输出结果（流式渲染） ───────┘
 *
 * DI：engine 从 props 传入，方便测试。
 *     生产环境由 main.tsx 从 getEngines().pickById('chrome-ai') 拿。
 */
import { useEffect, useState } from 'react';
import { Button } from '@components/Button';
import { useTranslate } from '@hooks/useTranslate';
import { getEngines } from '@core/engines';
import type { Engine } from '@engines/types';

interface Props {
  /** 依赖注入。测试用 mock；生产由 main.tsx 传 getEngines().pickById('chrome-ai') */
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

export default function SidePanelApp({ engine }: Props = {}) {
  // 惰性拿单例，避免测试环境访问 chrome API 出错
  const resolvedEngine = engine ?? getEngines().pickById('chrome-ai');
  const [text, setText] = useState('');
  const [target, setTarget] = useState('zh');
  const [source, setSource] = useState('auto'); // 'auto' 由引擎推断
  const [available, setAvailable] = useState<boolean | null>(null);

  // 只要有引擎就跑 useTranslate。为 hook 稳定，引擎缺失时用 no-op stub
  const stubEngine: Engine = {
    id: 'chrome-ai',
    name: 'unavailable',
    priority: 0,
    isAvailable: async () => false,
    supports: () => false,
    run: async () => '',
  };
  const { output, status, error, translate, reset } = useTranslate({
    engine: resolvedEngine ?? stubEngine,
  });

  // 检测引擎可用性（挂载时一次）
  useEffect(() => {
    if (!resolvedEngine) {
      setAvailable(false);
      return;
    }
    resolvedEngine.isAvailable().then(setAvailable).catch(() => setAvailable(false));
  }, [resolvedEngine]);

  const canTranslate = text.trim().length > 0 && status !== 'loading' && available !== false;

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

      {available === false && (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
          role="alert"
        >
          Chrome AI 内置翻译不可用。请升级到 Chrome 138+ 并在
          <code className="mx-1 px-1 bg-amber-100 rounded">chrome://flags</code>
          启用 "Translation API"。
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
        {status === 'error' && error ? (
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
