/**
 * SelectionBubble 组件测试
 *
 * 契约：
 * 1. 传入 selectedText='' → 不渲染任何东西
 * 2. 传入 selectedText + rect → 渲染鸭子图标按钮，position: absolute 定位在 rect 右下
 * 3. 点击图标 → 触发 onTrigger(selectedText)
 * 4. 翻译中 status=loading → 显示 "翻译中…"
 * 5. 翻译完 status=success → 显示 output 文本 + 引擎徽章
 * 6. 出错 status=error → 显示错误信息
 * 7. 按 Esc / 点浮标外 → 触发 onDismiss
 * 8. 定位：默认在选区 bottom+8 / left（避免遮住选区，超出视口自动上翻由浏览器排版兜底）
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionBubble } from '@components/SelectionBubble';

const rect = {
  top: 100,
  left: 200,
  right: 260,
  bottom: 120,
  width: 60,
  height: 20,
};

describe('SelectionBubble', () => {
  it('无选中文本 → 不渲染', () => {
    const { container } = render(
      <SelectionBubble selectedText="" rect={null} status="idle" onTrigger={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('有选中 + rect → 渲染触发按钮定位在 rect 下方', () => {
    render(
      <SelectionBubble
        selectedText="hello"
        rect={rect}
        status="idle"
        onTrigger={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    const btn = screen.getByRole('button', { name: /翻译|校对鸭/ });
    expect(btn).toBeInTheDocument();

    // 容器 position:fixed 定位到 rect.bottom + 8
    const bubble = btn.closest('[data-proofduck-bubble]') as HTMLElement;
    expect(bubble).not.toBeNull();
    expect(bubble.style.top).toBe(`${rect.bottom + 8}px`);
    expect(bubble.style.left).toBe(`${rect.left}px`);
  });

  it('点击图标 → 触发 onTrigger 带 selectedText', () => {
    const onTrigger = vi.fn();
    render(
      <SelectionBubble
        selectedText="hello world"
        rect={rect}
        status="idle"
        onTrigger={onTrigger}
        onDismiss={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /翻译|校对鸭/ }));
    expect(onTrigger).toHaveBeenCalledWith('hello world');
  });

  it('status=loading → 显示"翻译中"提示', () => {
    render(
      <SelectionBubble
        selectedText="hello"
        rect={rect}
        status="loading"
        onTrigger={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/翻译中|加载中|…/)).toBeInTheDocument();
  });

  it('status=success + output → 显示译文 + 引擎名', () => {
    render(
      <SelectionBubble
        selectedText="hello"
        rect={rect}
        status="success"
        output="你好"
        engineName="免费翻译"
        onTrigger={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText(/免费翻译/)).toBeInTheDocument();
  });

  it('status=error → 显示错误信息', () => {
    render(
      <SelectionBubble
        selectedText="hello"
        rect={rect}
        status="error"
        error="网络错误"
        onTrigger={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/网络错误/)).toBeInTheDocument();
  });

  it('按 Escape → 触发 onDismiss', () => {
    const onDismiss = vi.fn();
    render(
      <SelectionBubble
        selectedText="hello"
        rect={rect}
        status="idle"
        onTrigger={vi.fn()}
        onDismiss={onDismiss}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('点浮标外 → 触发 onDismiss', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <div>
        <div data-testid="outside">outside</div>
        <SelectionBubble
          selectedText="hello"
          rect={rect}
          status="idle"
          onTrigger={vi.fn()}
          onDismiss={onDismiss}
        />
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('点浮标内部 → 不触发 onDismiss', () => {
    const onDismiss = vi.fn();
    render(
      <SelectionBubble
        selectedText="hello"
        rect={rect}
        status="success"
        output="你好"
        onTrigger={vi.fn()}
        onDismiss={onDismiss}
      />
    );
    fireEvent.mouseDown(screen.getByText('你好'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ========================
  // Gemini review #1: Shadow DOM 里 e.target 会被 retargeting 到 host 节点，
  // 用 composedPath 判断"点击是否在浮标内"才准确
  // ========================
  it('composedPath 包含浮标根节点时 → 判定为内部点击，不 dismiss（Shadow DOM 场景）', () => {
    const onDismiss = vi.fn();
    render(
      <SelectionBubble
        selectedText="hello"
        rect={rect}
        status="success"
        output="你好"
        onTrigger={vi.fn()}
        onDismiss={onDismiss}
      />
    );
    const bubble = document.querySelector('[data-proofduck-bubble]') as HTMLElement;
    // 模拟 Shadow DOM 场景：event.target 被 retarget 到宿主页 body（外部），
    // 但 composedPath 里包含浮标根节点 → 应该判定为内部
    const evt = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(evt, 'target', { value: document.body });
    Object.defineProperty(evt, 'composedPath', {
      value: () => [bubble, document.body, document],
    });
    document.dispatchEvent(evt);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
