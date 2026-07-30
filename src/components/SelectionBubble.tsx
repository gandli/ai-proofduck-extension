/**
 * SelectionBubble (v0.4 UI 重设计): 划词浮标
 *
 * v0.4 UI 变更：
 * - success 态改为深色气泡（ink-900 底）+ serif 白字，与网页背景形成清晰对比
 * - 顶部小箭头指向选区
 * - 引擎徽章 + 操作栏（复制 / 侧边栏 / 关闭）
 * - 底部 kbd 快捷键提示（Esc 关闭）
 * - idle 触发按钮改用品牌黄渐变
 *
 * 用户在网页里选中文本后，浮标会出现在选区右下角。
 *
 * 状态机：
 *   idle    → 显示 [icon 翻译] 按钮，等用户点击
 *   loading → 显示"翻译中…"
 *   success → 深色气泡展示译文 + 引擎徽章 + 操作栏
 *   error   → 显示错误信息
 *
 * 交互：
 *   - 点鸭子按钮 → 触发 onTrigger(selectedText)
 *   - Esc / 点浮标外 → 触发 onDismiss
 *   - 点浮标内部（复制、朗读）→ 不 dismiss
 *
 * 定位：
 *   容器 position: fixed（因为要跟随视口，不受页面滚动影响时
 *   由上层负责传新的 rect；测试用 style.top/left 校验字符串值即可）
 *   放在选区 rect.bottom + 8 / rect.left，避免遮住选区本身。
 *   超出视口时的边缘处理暂不加（v0.3.0 先能用，v0.4 再打磨）。
 *
 * Shadow DOM 场景：Tailwind 在 content script 里通常靠 wxt-css 注入；
 * 这里所有关键样式**同时给一层内联 fallback**，即使 CSS 加载失败也能看。
 */
import { useEffect, useRef, useState, memo } from 'react';
import type { SelectionRect } from '@hooks/useSelection';
import { SuccessBubble } from './SuccessBubble';

export type BubbleStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SelectionBubbleProps {
  selectedText: string;
  rect: SelectionRect | null;
  status: BubbleStatus;
  output?: string;
  error?: string;
  engineName?: string;
  onTrigger: (text: string) => void;
  onDismiss: () => void;
}

// ⚡ Bolt: Wrap SelectionBubble with React.memo to prevent unnecessary re-renders when parent state updates.
// Impact: Reduces React render cycle overhead since the bubble is often re-evaluated during frequent text selections.
export const SelectionBubble = memo(function SelectionBubble(props: SelectionBubbleProps) {
  const { selectedText, rect, status, output, error, engineName, onTrigger, onDismiss } = props;
  const rootRef = useRef<HTMLDivElement>(null);

  // Esc 关闭
  // ⚡ Bolt: Only attach global keyboard listener when the bubble is visible to reduce CPU overhead.
  // Impact: Prevents firing the keydown event listener on every keypress across all pages when the extension bubble is inactive.
  useEffect(() => {
    if (!selectedText || !rect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss, selectedText, rect]);

  // 点浮标外关闭（Gemini review #1：Shadow DOM 里 e.target 会被 retargeting
  // 到 host 节点，contains 就假 false 直接 dismiss；用 composedPath 拿真路径）
  // ⚡ Bolt: Only attach global mousedown listener when the bubble is visible to reduce CPU overhead.
  // Impact: Prevents firing the mousedown event listener on every click across all pages when the extension bubble is inactive.
  useEffect(() => {
    if (!selectedText || !rect) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      const isInside = path.includes(el) || el.contains(e.target as Node);
      if (!isInside) {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onDismiss, selectedText, rect]);

  // 无选中不渲染
  if (!selectedText || !rect) return null;

  return (
    <div
      ref={rootRef}
      data-proofduck-bubble
      // position:fixed 让浮标相对视口定位；如果页面滚动，上层应
      // 传新的 rect 让浮标重新定位（v0.3.0 简化处理）
      style={{
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        zIndex: 2147483647, // 顶到天
      }}
      className="pd-bubble"
    >
      {status === 'idle' && (
        <button
          type="button"
          aria-label="翻译（校对鸭）"
          onClick={() => onTrigger(selectedText)}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-800 shadow-brand-lg ring-1 ring-brand-600 hover:brightness-105 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          style={{
            // v0.4：品牌黄渐变（与 icon.svg 同源 #f59f00）
            background: 'linear-gradient(180deg, #f59f00 0%, #d68b00 100%)',
            color: '#212529',
            border: '1px solid #d68b00',
            cursor: 'pointer',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(245,159,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          <img
            src={chrome?.runtime?.getURL?.('/icons/icon-16.png') ?? '/icons/icon-16.png'}
            alt=""
            aria-hidden
            style={{ width: 14, height: 14, borderRadius: 4, display: 'inline-block' }}
          />
          <span>翻译</span>
        </button>
      )}

      {status === 'loading' && (
        <div
          role="status"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-ink-200"
          style={{
            background: 'white',
            padding: '8px 14px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(73,80,87,0.15)',
            border: '1px solid #dee2e6',
            fontSize: 13,
            color: '#495057',
          }}
        >
          <span aria-hidden>⏳</span>
          <span>翻译中…</span>
        </div>
      )}

      {status === 'success' && (
        <SuccessBubble
          output={output || ''}
          engineName={engineName}
          onDismiss={onDismiss}
        />
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="max-w-sm rounded-lg text-sm shadow-lg"
          style={{
            background: '#fff5f5',
            color: '#862e2e',
            padding: '10px 14px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(224,49,49,0.15)',
            border: '1px solid rgba(224,49,49,0.3)',
            fontSize: 13,
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          <span aria-hidden style={{ marginRight: 4 }}>
            ⚠️
          </span>
          <span>{error || '翻译失败'}</span>
        </div>
      )}
    </div>
  );
});
