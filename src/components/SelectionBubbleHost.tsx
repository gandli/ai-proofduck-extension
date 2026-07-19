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
import { useRef, useState, useCallback } from 'react';
import { useSelection } from '@hooks/useSelection';
import { getEngines } from '@core/engines';
import type { Engine } from '@engines/types';
import { SelectionBubble, type BubbleStatus } from './SelectionBubble';
import { isPermissionRequiredError } from '@utils/permission-error';
import { formatErrorMessage } from '@utils/error';

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

  // 追踪 selectedText 的上一次值 —— 用渲染阶段状态重置替代 useEffect（Gemini review）
  // React 官方模式：https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // 好处：省一次渲染 + 消除 set-state-in-effect 警告 + 消除视觉闪烁
  const [prevSelectedText, setPrevSelectedText] = useState(selectedText);
  if (selectedText !== prevSelectedText) {
    setPrevSelectedText(selectedText);
    setStatus('idle');
    setOutput('');
    setError('');
    setEngineName('');
    setDismissed(false);
    // 使所有 pending 请求失效（在渲染阶段自增 ref 是有意的：让马上要 read 的 handler 一定拿到最新值）
    // eslint-disable-next-line react-hooks/refs -- 与状态重置同步的 ref bump 是模式的一部分
    requestIdRef.current += 1;
  }

  // ⚡ Bolt: Memoize handleTrigger callback to prevent child component re-renders.
  // Impact: With SelectionBubble wrapped in React.memo, memoizing this handler prevents breaking the memoization on every SelectionBubbleHost render.
  const handleTrigger = useCallback(async (_text: string) => {
    // 领当前请求令牌；只有这个令牌全程未变，本次结果才允许写状态
    const myRequestId = ++requestIdRef.current;
    setStatus('loading');
    setError('');
    setOutput('');
    try {
      // 生产走 pickBest；测试用注入
      const resolved = engine ?? (await getEngines().pickBest('translate'));
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
      // v0.5.5 P1-B（审计 v3）+ Gemini review 采纳：
      // SelectionBubble 是 UI 出口，Error.message 可能含 API 网关 echo 的
      // Authorization: Bearer sk-*** 明文。直接把 e 交给 formatErrorMessage，
      // 内部已覆盖 Error/plain object/string 三种形态——尤其重要的是跨进程
      // sendMessage 反序列化后的 Error 会丢失原型变成 {message:'...'} 普通对象，
      // 手动 e.message 会拿不到；formatErrorMessage 通过 extractRawMessage 兜底。
      setError(formatErrorMessage(e, '翻译失败'));
    }
  }, [engine, targetLang]);

  // ⚡ Bolt: Memoize handleDismiss callback to prevent child component re-renders.
  // Impact: Avoids unnecessary re-attachment of global event listeners in SelectionBubble on every render.
  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

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
