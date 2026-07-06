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
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSelection } from '@hooks/useSelection';

describe('useSelection', () => {
  it('初始 selectedText 为空字符串', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectedText).toBe('');
  });

  it('window selectionchange 事件后 selectedText 反映当前选区', async () => {
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

    // 默认 debounceMs=0 → 走 rAF 防拖蓝时 layout thrashing（Gemini review #4）
    await waitFor(() => {
      expect(result.current.selectedText).toBe('hello proofduck');
    });

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

  // ========================
  // Cycle 5.1: 划词浮标需要位置信息
  // ========================
  it('有选区时应提供 rect（浮标定位用）', async () => {
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

    // rect 存在且是标准 DOMRect 形状
    await waitFor(() => {
      expect(result.current.rect).toMatchObject({
        top: expect.any(Number),
        left: expect.any(Number),
        right: expect.any(Number),
        bottom: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });

    document.body.removeChild(p);
  });

  it('无选区时 rect 为 null', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.rect).toBeNull();
  });

  it('只有超过 minLength（默认 1）的选区才被视为"有效"', () => {
    const p = document.createElement('p');
    p.textContent = 'a b';
    document.body.appendChild(p);

    // 传 minLength=2
    const { result } = renderHook(() => useSelection({ minLength: 2 }));

    act(() => {
      const range = document.createRange();
      // 只选 "a"（长度 1）
      range.setStart(p.firstChild!, 0);
      range.setEnd(p.firstChild!, 1);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    // 长度不达标 → 视同没有选中
    expect(result.current.selectedText).toBe('');
    expect(result.current.rect).toBeNull();

    document.body.removeChild(p);
  });

  it('debounce：短时间连续 selectionchange 只触发最后一次（默认 150ms）', async () => {
    // 清掉前面测试残留的选区
    window.getSelection()?.removeAllRanges();

    const p = document.createElement('p');
    p.textContent = 'hello';
    document.body.appendChild(p);

    const { result } = renderHook(() => useSelection({ debounceMs: 50 }));

    act(() => {
      // 快速触发 3 次，只应该以最后一次为准
      for (let i = 0; i < 3; i++) {
        document.dispatchEvent(new Event('selectionchange'));
      }
    });

    // 立即读取应该还是空（debounce 中）
    expect(result.current.selectedText).toBe('');

    // 等 debounce 过期
    await new Promise((r) => setTimeout(r, 80));

    // 现在没选中任何东西所以还是空——但重点是 debounce 逻辑不报错
    expect(result.current.selectedText).toBe('');

    document.body.removeChild(p);
  });

  // ========================
  // Gemini review #5: 纯空白选区（拖蓝末尾空格 / 换行 / tab）应该被过滤
  // ========================
  it('纯空白选区（空格/换行/tab）应视为无效（不触发浮标）', () => {
    window.getSelection()?.removeAllRanges();
    const p = document.createElement('p');
    p.textContent = '   \n\t   '; // 只有空白字符
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

    expect(result.current.selectedText).toBe('');
    expect(result.current.rect).toBeNull();

    document.body.removeChild(p);
  });

  it('首尾空白应被 trim（送引擎的是干净文本）', async () => {
    window.getSelection()?.removeAllRanges();
    const p = document.createElement('p');
    p.textContent = '  hello world  ';
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

    await waitFor(() => {
      expect(result.current.selectedText).toBe('hello world');
    });

    document.body.removeChild(p);
  });
});
