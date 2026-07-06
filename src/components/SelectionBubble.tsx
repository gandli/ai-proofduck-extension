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
 *   idle    → 显示 [🦆 翻译] 按钮，等用户点击
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

  // 复制到剪贴板
  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).catch(() => {
      // 用户拒绝或非 secure context —— 忽略即可
    });
  };

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
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-800 shadow-brand-lg ring-1 ring-brand-600 hover:brightness-105 transition"
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
          <span aria-hidden>🦆</span>
          <span>翻译</span>
        </button>
      )}

      {status === 'loading' && (
        <div
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
        <div
          // v0.4：深色气泡 + 顶部箭头
          style={{
            position: 'relative',
            background: '#495057',
            color: 'white',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(73,80,87,0.28), 0 2px 4px rgba(73,80,87,0.15)',
            border: '1px solid #343a40',
            padding: '10px 12px',
            fontSize: 13,
            maxWidth: 320,
            lineHeight: 1.6,
          }}
        >
          {/* 顶部箭头指向选区 */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -6,
              left: 20,
              width: 12,
              height: 12,
              background: '#495057',
              transform: 'rotate(45deg)',
              borderRadius: 2,
              borderTop: '1px solid #343a40',
              borderLeft: '1px solid #343a40',
            }}
          />
          {/* 顶栏：引擎 + 操作 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
              gap: 8,
            }}
          >
            {engineName && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  color: '#ffd43b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                <span aria-hidden>🖥</span>
                <span>{engineName}</span>
              </span>
            )}
            <div style={{ display: 'flex', gap: 1 }}>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="复制译文"
                title="复制译文"
                style={{
                  width: 22,
                  height: 22,
                  background: 'transparent',
                  border: 'none',
                  color: '#ced4da',
                  cursor: 'pointer',
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#ced4da';
                }}
              >
                📋
              </button>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="关闭"
                title="关闭（Esc）"
                style={{
                  width: 22,
                  height: 22,
                  background: 'transparent',
                  border: 'none',
                  color: '#ced4da',
                  cursor: 'pointer',
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#ced4da';
                }}
              >
                ✕
              </button>
            </div>
          </div>
          {/* 译文 */}
          <div
            style={{
              fontFamily: '"Noto Serif SC", Georgia, serif',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'white',
            }}
          >
            {output}
          </div>
          {/* 底部快捷键提示 */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              fontSize: 10.5,
              color: '#adb5bd',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <span>
              <kbd
                style={{
                  fontFamily: '"JetBrains Mono", "SF Mono", monospace',
                  background: 'rgba(255,255,255,0.08)',
                  padding: '1px 5px',
                  borderRadius: 3,
                  color: '#ced4da',
                  fontSize: 10,
                }}
              >
                Esc
              </kbd>{' '}
              关闭
            </span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div
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
}
