/**
 * SelectionBubbleHost: 顶层 host 组件（Cycle 5.3/5.4）
 *
 * 职责：
 * - 用 useSelection 追踪选中文本
 * - 状态机管理浮标（idle/loading/success/error）
 * - 点浮标 → 走 EngineManager.pickBest() → engine.run()
 *
 * 单独抽出让 content script 主文件保持精简，也方便单测。
 */
import { useEffect, useState } from 'react';
import { useSelection } from '@hooks/useSelection';
import { getEngines } from '@core/engines';
import type { Engine } from '@engines/types';
import { SelectionBubble, type BubbleStatus } from './SelectionBubble';

export interface SelectionBubbleHostProps {
  /** 测试可注入固定引擎；生产走 pickBest() */
  engine?: Engine;
  /** 目标语言，默认中文 */
  targetLang?: string;
  /** 最小选区长度 */
  minLength?: number;
}

export function SelectionBubbleHost(props: SelectionBubbleHostProps) {
  const { engine, targetLang = 'zh-CN', minLength = 2 } = props;

  // 追踪选区
  const { selectedText, rect } = useSelection({ minLength, debounceMs: 100 });

  // 独立"活动会话"：用户新选一段就重置状态
  const [status, setStatus] = useState<BubbleStatus>('idle');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [engineName, setEngineName] = useState('');
  // dismiss 后不再显示，直到新选区
  const [dismissed, setDismissed] = useState(false);
  // 记录当前"活跃选中文本"——切换时重置状态
  const [activeText, setActiveText] = useState('');

  // 选中文本变化：重置状态
  useEffect(() => {
    if (selectedText !== activeText) {
      setActiveText(selectedText);
      setStatus('idle');
      setOutput('');
      setError('');
      setEngineName('');
      setDismissed(false);
    }
  }, [selectedText, activeText]);

  async function handleTrigger(text: string) {
    setStatus('loading');
    setError('');
    setOutput('');
    try {
      // 生产走 pickBest；测试用注入
      const resolved = engine ?? (await getEngines().pickBest());
      if (!resolved) {
        setStatus('error');
        setError('没有可用的翻译引擎，请到扩展设置里配置');
        return;
      }
      setEngineName(resolved.name);
      const result = await resolved.run({
        mode: 'translate',
        text,
        sourceLang: undefined,
        targetLang,
      });
      // Engine.run 直接返回 string
      const finalText = typeof result === 'string' ? result : String(result ?? '');
      setOutput(finalText);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }

  function handleDismiss() {
    setDismissed(true);
  }

  // 用户 dismiss 后隐藏浮标（直到新选区）
  const visibleText = dismissed ? '' : selectedText;
  const visibleRect = dismissed ? null : rect;

  return (
    <SelectionBubble
      selectedText={visibleText}
      rect={visibleRect}
      status={status}
      output={output}
      error={error}
      engineName={engineName}
      onTrigger={handleTrigger}
      onDismiss={handleDismiss}
    />
  );
}
