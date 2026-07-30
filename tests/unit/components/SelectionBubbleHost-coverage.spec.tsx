import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SelectionBubbleHost } from '@components/SelectionBubbleHost';
import type { Engine } from '@engines/types';

function makeMockEngine(overrides: Partial<Engine> = {}): Engine {
  return {
    id: 'free-translate',
    name: '免费翻译',
    priority: 60,
    isAvailable: async () => true,
    supports: () => true,
    run: async ({ text }) => `[FREE]${text}`,
    ...overrides,
  } as Engine;
}

function selectText(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

/** 本文件补齐技巧：
 *  用 vi.importActual 避免 vi.doMock 的副作用干扰，且不产生未受控的 import/export */
describe('SelectionBubbleHost — coverage edge cases', () => {
  afterEach(() => {
    // 清理所有测试添加到 body 的临时节点
    document.body.querySelectorAll('p, div').forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  });

  it('翻译完成后按 Escape → dismiss（handleDismiss 回调 L113-114）', async () => {
    const p = document.createElement('p');
    p.textContent = 'some text';
    document.body.appendChild(p);

    render(<SelectionBubbleHost engine={makeMockEngine()} />);
    act(() => selectText(p));
    await waitFor(() => screen.getByRole('button', { name: /翻译/ }));

    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));
    await waitFor(() => screen.getByText('[FREE]some text'));

    // 按 Escape → 浮标消失
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('[FREE]some text')).toBeNull();
    });
  });
});
