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
import { useEffect, useRef, useState } from 'react';
import { useSelection } from '@hooks/useSelection';
import { getEngines } from '@core/engines';
import type { Engine } from '@engines/types';
import { SelectionBubble, type BubbleStatus } from './SelectionBubble';
import { isPermissionRequiredError } from '@utils/permission-error';

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

  // Gemini/CodeRabbit review：用请求令牌（比 text 比对更严）解决异步竞态
  // - 用户取消再重选同一段：text 相等但状态已被 idle 重置，selectedText 比对会漏
  // - requestId 每次会话变化时 +1，pending 请求回来对不上就直接丢
  const requestIdRef = useRef(0);

  // 独立"活动会话"：用户新选一段就重置状态
  const [status, setStatus] = useState<BubbleStatus>('idle');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [engineName, setEngineName] = useState('');
  // dismiss 后不再显示，直到新选区
  const [dismissed, setDismissed] = useState(false);
  // 记录当前"活跃选中文本"——切换时重置状态
  const [activeText, setActiveText] = useState('');

  // 选中文本变化：重置状态 + 让在飞的翻译请求全部作废（requestId +1）
  useEffect(() => {
    if (selectedText !== activeText) {
      setActiveText(selectedText);
      setStatus('idle');
      setOutput('');
      setError('');
      setEngineName('');
      setDismissed(false);
      requestIdRef.current += 1; // 使所有 pending 请求失效
    }
  }, [selectedText, activeText]);

  async function handleTrigger(_text: string) {
    // 领当前请求令牌；只有这个令牌全程未变，本次结果才允许写状态
    const myRequestId = ++requestIdRef.current;
    setStatus('loading');
    setError('');
    setOutput('');
    try {
      // 生产走 pickBest；测试用注入
      const resolved = engine ?? (await getEngines().pickBest());
      if (myRequestId !== requestIdRef.current) return; // 已过期
      if (!resolved) {
        setStatus('error');
        setError('没有可用的翻译引擎，请到扩展设置里配置');
        return;
      }
      setEngineName(resolved.name);
      const result = await resolved.run({
        mode: 'translate',
        text: _text,
        sourceLang: undefined,
        targetLang,
      });
      if (myRequestId !== requestIdRef.current) return; // 已过期
      // Engine.run 直接返回 string
      const finalText = typeof result === 'string' ? result : String(result ?? '');
      setOutput(finalText);
      setStatus('success');
    } catch (e) {
      if (myRequestId !== requestIdRef.current) return; // 已过期
      setStatus('error');
      // Round 6 (#465): 权限错误 → UX 引导用户去 Options 授权
      if (isPermissionRequiredError(e)) {
        const origin = (e as { origin: string }).origin;
        setError(`扩展缺少访问 ${origin} 的权限。请到「扩展设置」页点【授权】按钮授权后重试。`);
        return;
      }
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
