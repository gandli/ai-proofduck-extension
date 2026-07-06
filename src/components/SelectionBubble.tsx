/**
 * SelectionBubble: 划词浮标（Cycle 5）
 *
 * 用户在网页里选中文本后，浮标会出现在选区右下角。
 *
 * 状态机：
 *   idle    → 只显示鸭子图标，等用户点击
 *   loading → 显示"翻译中…"
 *   success → 显示译文 + 引擎徽章
 *   error   → 显示错误信息
 *
 * 交互：
 *   - 点鸭子图标 → 触发 onTrigger(selectedText)
 *   - Esc / 点浮标外 → 触发 onDismiss
 *   - 点浮标内部（比如复制译文）→ 不 dismiss
 *
 * 定位：
 *   容器 position: fixed（因为要跟随视口，不受页面滚动影响时
 *   由上层负责传新的 rect；测试用 style.top/left 校验字符串值即可）
 *   放在选区 rect.bottom + 8 / rect.left，避免遮住选区本身。
 *   超出视口时的边缘处理暂不加（v0.3.0 先能用，v0.4 再打磨）。
 */
import { useEffect, useRef } from 'react';
import type { SelectionRect } from '@hooks/useSelection';

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

export function SelectionBubble(props: SelectionBubbleProps) {
  const { selectedText, rect, status, output, error, engineName, onTrigger, onDismiss } = props;
  const rootRef = useRef<HTMLDivElement>(null);

  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  // 点浮标外关闭（Gemini review #1：Shadow DOM 里 e.target 会被 retargeting
  // 到 host 节点，contains 就假 false 直接 dismiss；用 composedPath 拿真路径）
  useEffect(() => {
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
  }, [onDismiss]);

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
      // Tailwind 在 content script 里通常靠 wxt-css 注入；这里备一层
      // 内联 fallback 样式，即使 CSS 加载失败也能看
      className="pd-bubble"
    >
      {status === 'idle' && (
        <button
          type="button"
          aria-label="翻译（校对鸭）"
          onClick={() => onTrigger(selectedText)}
          className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-2.5 py-1.5 text-sm font-medium text-slate-900 shadow-lg ring-1 ring-black/10 hover:bg-yellow-300 transition"
          style={{
            background: '#facc15',
            color: '#0f172a',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: 13,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <span aria-hidden>🦆</span>
          <span>翻译</span>
        </button>
      )}

      {status === 'loading' && (
        <div
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-black/10"
          style={{
            background: 'white',
            padding: '6px 12px',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 13,
          }}
        >
          <span aria-hidden>⏳</span>
          <span>翻译中…</span>
        </div>
      )}

      {status === 'success' && (
        <div
          className="max-w-sm rounded-lg bg-white p-3 text-sm shadow-lg ring-1 ring-black/10"
          style={{
            background: 'white',
            padding: '10px 12px',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 13,
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          <div className="mb-1 text-slate-900" style={{ color: '#0f172a' }}>
            {output}
          </div>
          {engineName && (
            <div
              className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"
              style={{ color: '#64748b', fontSize: 11 }}
            >
              <span aria-hidden>🌐</span>
              <span>{engineName}</span>
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div
          className="max-w-sm rounded-lg bg-red-50 p-3 text-sm text-red-700 shadow-lg ring-1 ring-red-200"
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 13,
            maxWidth: 320,
          }}
        >
          <span aria-hidden>⚠️ </span>
          <span>{error || '翻译失败'}</span>
        </div>
      )}
    </div>
  );
}
