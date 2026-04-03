/**
 * useFocusTrap - 焦点陷阱 Hook
 * 用于在浮层打开时将焦点限制在浮层内，关闭时恢复焦点
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapOptions {
  /** 是否启用焦点陷阱 */
  enabled?: boolean;
  /** 焦点陷阱容器 ref */
  containerRef: React.RefObject<HTMLElement | null>;
  /** 浮层关闭时聚焦的元素（通常是触发浮层的按钮） */
  returnFocusTarget?: HTMLElement | null;
}

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * 获取容器内所有可聚焦元素
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => el.offsetParent !== null // 检查元素是否可见
  );
}

/**
 * 焦点陷阱 Hook
 *
 * @example
 * ```tsx
 * const containerRef = useRef(null);
 * const returnFocusTarget = useRef(null);
 *
 * useFocusTrap({
 *   enabled: isOpen,
 *   containerRef,
 *   returnFocusTarget: returnFocusTarget.current,
 * });
 * ```
 */
export function useFocusTrap({
  enabled = true,
  containerRef,
  returnFocusTarget,
}: UseFocusTrapOptions) {
  // 保存之前聚焦的元素
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 聚焦到容器内的第一个可聚焦元素
  const focusFirstElement = useCallback(() => {
    if (!containerRef.current) return;

    const focusable = getFocusableElements(containerRef.current);
    const firstFocusable = focusable[0];
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      // 如果没有可聚焦元素，聚焦到容器本身
      containerRef.current.focus();
    }
  }, [containerRef]);

  // 启用焦点陷阱
  useEffect(() => {
    if (!enabled) return;

    // 保存当前聚焦的元素
    previousFocusRef.current = document.activeElement as HTMLElement;

    // 延迟聚焦到浮层，避免立即聚焦失败
    const timer = requestAnimationFrame(() => {
      focusFirstElement();
    });

    return () => {
      cancelAnimationFrame(timer);
    };
  }, [enabled, focusFirstElement]);

  // 处理 Tab 键 - 循环焦点
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (!firstElement || !lastElement) return;

      // Shift + Tab: 从第一个元素跳到最后一个
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab: 从最后一个元素跳到第一个
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enabled, containerRef]);

  // 恢复焦点
  const restoreFocus = useCallback(() => {
    if (returnFocusTarget && returnFocusTarget.focus) {
      returnFocusTarget.focus();
    } else if (previousFocusRef.current && previousFocusRef.current.focus) {
      previousFocusRef.current.focus();
    }
  }, [returnFocusTarget]);

  return {
    restoreFocus,
    focusFirstElement,
  };
}

export default useFocusTrap;