/**
 * SidePanel App · 状态 + 逻辑 + 子组件组合器
 *
 * P2-A（审计 v2）：从 383 loc 拆到 ~150 loc。
 * 4 子组件按视觉区域拆分（components/*）：
 *   - EngineStatus  · header + 引擎徽章 + 无引擎横幅
 *   - LanguageBar   · 源/交换/目标 3 列语言栏
 *   - Editor        · 原文 textarea + CTA 按钮组
 *   - ResultPanel   · 译文输出（5 视觉态）
 *
 * 本文件仅剩：state / 引擎解析 / 可用性检测 / handleSwap / handleKeyDown / handleTranslate。
 *
 * DI：engine 从 props 传入，方便测试。生产从 EngineManager.pickBest() 兜底选。
 *
 * Bug #P0 修复：早期版本硬编码 pickById('chrome-ai')，Chrome 138 以下就废了整个扩展。
 * 现在走 pickBest() 自动选出**当前可用**的最高优先级引擎。
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslate } from '@hooks/useTranslate';
import { getEngines } from '@core/engines';
import type { Engine } from '@engines/types';
import { MAX_CHARS, STUB_ENGINE } from './constants';
import { EngineStatus } from './components/EngineStatus';
import { LanguageBar } from './components/LanguageBar';
import { Editor } from './components/Editor';
import { ResultPanel } from './components/ResultPanel';

interface Props {
  /** 依赖注入。测试用 mock；生产由 useEffect 从 pickBest() 拿 */
  engine?: Engine;
}

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
      // 测试注入路径：初始 state 已用 engine ?? null / !engine 初始化，无需重设
      // (Gemini review 建议：省一次渲染，同时消除 set-state-in-effect 警告)
      return;
    }
    // 生产路径：走 pickBest() 兜底（初始 isResolving = !engine 已经是 true，无需再设）
    let cancelled = false;
    void getEngines()
      .pickBest('translate')
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

  // 字数计数在同语言校验之前算完，供 canTranslate 一并判定
  const charCount = text.length;
  const isOver = charCount > MAX_CHARS;

  // 同语言校验：手动选定的源和目标一样时无意义（'auto' 例外，由引擎自行推断）
  const isSameLanguage = source !== 'auto' && source === target;
  const canTranslate =
    text.trim().length > 0 &&
    !isOver &&
    status !== 'loading' &&
    available !== false &&
    !isSameLanguage;

  // ⚡ Bolt: Memoize event handler functions to prevent unnecessary re-renders of child components.
  // Impact: Avoids unnecessary React re-renders when parent state updates that don't affect these specific components.
  const handleTranslate = useCallback(() => {
    // 'auto' → 让引擎自己推断；chrome-ai 目前需要显式 source，暂用启发式：中→英，其他→中
    const src = source === 'auto' ? (target === 'zh' ? 'en' : 'zh') : source;
    void translate(text, { source: src, target });
  }, [source, target, text, translate]);

  // 交换语言：auto 时不能交换（无源语言）
  const handleSwap = useCallback(() => {
    if (source === 'auto') return;
    setSource(target);
    setTarget(source);
  }, [source, target]);

  // Ctrl/⌘ + Enter 快捷键提交
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canTranslate) {
      e.preventDefault();
      handleTranslate();
    }
  }, [canTranslate, handleTranslate]);

  const handleClear = useCallback(() => {
    setText('');
    reset();
  }, [reset]);

  return (
    <div className="min-h-screen bg-beige-50 text-ink-warm flex flex-col">
      <EngineStatus resolvedEngine={resolvedEngine} available={available} />

      {/* 主体 */}
      <div className="flex-1 p-4 space-y-3">
        <LanguageBar
          source={source}
          target={target}
          onSourceChange={setSource}
          onTargetChange={setTarget}
          onSwap={handleSwap}
        />

        <Editor
          text={text}
          onTextChange={setText}
          onKeyDown={handleKeyDown}
          charCount={charCount}
          isOver={isOver}
          status={status}
          canTranslate={canTranslate}
          onTranslate={handleTranslate}
          onClear={handleClear}
        />

        <ResultPanel
          output={output}
          status={status}
          error={error}
          isOver={isOver}
          isSameLanguage={isSameLanguage}
          canTranslate={canTranslate}
          onRetry={handleTranslate}
        />
      </div>
    </div>
  );
}
