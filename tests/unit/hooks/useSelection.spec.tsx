/**
 * useSelection hook 单元测试
 *
 * 设计动机：
 * - Popup / SidePanel 都需要「用户当前选中的文本」
 * - 简单包 window.getSelection() + selectionchange 事件
 *
 * 契约：
 * 1. 初始 selectedText 为 ''
 * 2. 选区变化时 selectedText 更新
 * 3. 组件卸载时移除 selectionchange 监听器（不泄漏）
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '@hooks/useSelection';

describe('useSelection', () => {
  it('初始 selectedText 为空字符串', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectedText).toBe('');
  });

  it('window selectionchange 事件后 selectedText 反映当前选区', () => {
    // 在 happy-dom 里挂一段文本、选中一部分
    const p = document.createElement('p');
    p.textContent = 'hello proofduck';
    document.body.appendChild(p);

    const { result } = renderHook(() => useSelection());

    act(() => {
      const range = document.createRange();
      range.selectNodeContents(p);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    expect(result.current.selectedText).toBe('hello proofduck');

    document.body.removeChild(p);
  });

  it('卸载后不再更新（无泄漏）', () => {
    const { result, unmount } = renderHook(() => useSelection());
    unmount();

    // 卸载后触发事件，不应报错也不该抛异常
    expect(() => {
      document.dispatchEvent(new Event('selectionchange'));
    }).not.toThrow();
    expect(result.current.selectedText).toBe('');
  });
});
