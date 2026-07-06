/**
 * useSelection: 追踪当前文档的选中文本 + 选区位置（Cycle 5：划词浮标）
 *
 * 应用场景：
 * - Popup / SidePanel 里读取用户在当前页选中的文本作为初始输入
 * - 划词浮标（SelectionBubble）用 rect 定位到选区右下角
 *
 * 实现要点：
 * - 订阅 document.selectionchange 事件（比 window.mouseup 更精准）
 * - 用 requestAnimationFrame + setTimeout 做 debounce，避免拖蓝时高频重渲染
 * - selection.getRangeAt(0).getBoundingClientRect() 拿视口相对位置
 * - 卸载时清理监听器 + 取消 pending 定时器，避免泄漏和 setState after unmount
 */
import { useEffect, useState } from 'react';

/** 选中的位置信息（DOMRect 简化版，只保留浮标定位需要的字段） */
export interface SelectionRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface UseSelectionOptions {
  /** 少于此长度的选区视为"无效"（防止不小心 click 触发单字符 rect） */
  minLength?: number;
  /** debounce 毫秒数，避免拖蓝时高频更新 */
  debounceMs?: number;
}

export interface UseSelectionResult {
  selectedText: string;
  rect: SelectionRect | null;
}

/**
 * 从当前 window.getSelection() 拿一个纯值快照。
 * 抽成模块级函数：便于测试 stub、避免闭包捕获 stale state。
 */
function readSelection(minLength: number): UseSelectionResult {
  const sel = window.getSelection();
  const raw = sel?.toString() ?? '';
  // Gemini review #5：过滤纯空白选区（拖蓝末尾空格 / 换行 / tab）
  const text = raw.trim();

  if (text.length < minLength || !sel || sel.rangeCount === 0) {
    return { selectedText: '', rect: null };
  }

  // 取第一个 range 的 bbox。多段选区（Ctrl+click）罕见，忽略后段。
  const range = sel.getRangeAt(0);
  const dr = range.getBoundingClientRect();
  // happy-dom 下 DOMRect 各字段可能是 0，但形状齐全，能通过契约测试。
  const rect: SelectionRect = {
    top: dr.top,
    left: dr.left,
    right: dr.right,
    bottom: dr.bottom,
    width: dr.width,
    height: dr.height,
  };

  return { selectedText: text, rect };
}

export function useSelection(options: UseSelectionOptions = {}): UseSelectionResult {
  const { minLength = 1, debounceMs = 0 } = options;

  const [state, setState] = useState<UseSelectionResult>({
    selectedText: '',
    rect: null,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let rafId: number | null = null;
    let mounted = true;

    const apply = () => {
      if (!mounted) return;
      const next = readSelection(minLength);
      setState(next);
    };

    const onChange = () => {
      // Gemini review #4：拖蓝时 selectionchange 高频触发，
      // getBoundingClientRect 每次都会同步 reflow → layout thrashing。
      // debounceMs<=0 时用 rAF 把 DOM 读推到下一帧渲染前。
      if (debounceMs <= 0) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(apply);
        return;
      }
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(apply, debounceMs);
    };

    document.addEventListener('selectionchange', onChange);
    return () => {
      mounted = false;
      if (timer !== null) clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('selectionchange', onChange);
    };
  }, [minLength, debounceMs]);

  return state;
}
