/**
 * SelectionBubbleHost 集成测试
 *
 * 关键契约：
 * 1. useSelection 选中 → 浮标出现（idle）
 * 2. 点鸭子按钮 → 调用注入引擎的 run() 一次
 * 3. run() 返回后 → 显示译文 + 引擎名
 * 4. run() 抛错 → 显示 error 状态
 * 5. 用户新选一段 → 状态重置回 idle
 * 6. 未注入 engine + pickBest 返回 null → 显示 "没有可用引擎"
 */
import { describe, it, expect, vi } from 'vitest';
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

describe('SelectionBubbleHost', () => {
  it('选中文本 → 浮标出现在 idle 状态（显示鸭子按钮）', async () => {
    const p = document.createElement('p');
    p.textContent = 'hello world';
    document.body.appendChild(p);

    render(<SelectionBubbleHost engine={makeMockEngine()} />);

    act(() => selectText(p));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /翻译/ })).toBeInTheDocument();
    });

    document.body.removeChild(p);
  });

  it('点鸭子 → 调用 engine.run() 一次并渲染译文 + 引擎名', async () => {
    const p = document.createElement('p');
    p.textContent = 'hello';
    document.body.appendChild(p);

    const run = vi.fn(async ({ text }: { text: string }) => `[MOCK]${text}`);
    const engine = makeMockEngine({ name: '测试引擎', run: run as never });

    render(<SelectionBubbleHost engine={engine} />);

    act(() => selectText(p));
    await waitFor(() => screen.getByRole('button', { name: /翻译/ }));

    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText('[MOCK]hello')).toBeInTheDocument();
      expect(screen.getByText(/测试引擎/)).toBeInTheDocument();
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'hello', mode: 'translate' })
    );

    document.body.removeChild(p);
  });

  it('engine.run 抛错 → 状态变 error 并显示错误信息', async () => {
    const p = document.createElement('p');
    p.textContent = 'hi';
    document.body.appendChild(p);

    const engine = makeMockEngine({
      run: (async () => {
        throw new Error('网络不通');
      }) as never,
    });

    render(<SelectionBubbleHost engine={engine} />);
    act(() => selectText(p));
    await waitFor(() => screen.getByRole('button', { name: /翻译/ }));
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText(/网络不通/)).toBeInTheDocument();
    });

    document.body.removeChild(p);
  });

  // ========================
  // Gemini review #2: 异步竞态——翻译返回时用户已换选区
  // ========================
  it('翻译中途换选区 → 旧译文不应覆盖新状态（竞态保护）', async () => {
    const p1 = document.createElement('p');
    p1.textContent = 'first';
    document.body.appendChild(p1);
    const p2 = document.createElement('p');
    p2.textContent = 'second';
    document.body.appendChild(p2);

    // 用 promise 手动控制 run 何时 resolve
    let releaseRun: (v: string) => void = () => {};
    const runPromise = new Promise<string>((r) => {
      releaseRun = r;
    });
    const engine = makeMockEngine({
      run: (async () => runPromise) as never,
    });

    render(<SelectionBubbleHost engine={engine} />);

    // 选 first → 点翻译
    act(() => selectText(p1));
    await waitFor(() => screen.getByRole('button', { name: /翻译/ }));
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));
    // 应该在 loading
    await waitFor(() => expect(screen.getByText(/翻译中/)).toBeInTheDocument());

    // 用户换选区到 second（旧翻译还在 pending）— 等 selectedText 真的更新
    act(() => selectText(p2));
    await waitFor(() => {
      // "翻译"按钮出现说明新会话已生效（idle 态）
      expect(screen.queryByText(/翻译中/)).toBeNull();
    });

    // 旧翻译现在 resolve 出旧结果——不应该显示
    releaseRun('第一段的旧译文');

    // 等 100ms 确保 promise 处理完毕
    await new Promise((r) => setTimeout(r, 100));

    // 断言旧译文没被渲染
    expect(screen.queryByText('第一段的旧译文')).toBeNull();

    document.body.removeChild(p1);
    document.body.removeChild(p2);
  });

  it('未传 engine + pickBest 返回 null → 显示"没有可用引擎"', async () => {
    const pickBest = vi.fn().mockResolvedValue(null);
    vi.doMock('@core/engines', () => ({
      getEngines: () => ({ pickBest, pickById: vi.fn(), register: vi.fn(), list: () => [] }),
      _resetEnginesForTest: () => {},
    }));

    vi.resetModules();
    const { SelectionBubbleHost: FreshHost } = await import('@components/SelectionBubbleHost');

    const p = document.createElement('p');
    p.textContent = 'hi';
    document.body.appendChild(p);

    render(<FreshHost />);
    act(() => selectText(p));
    await waitFor(() => screen.getByRole('button', { name: /翻译/ }));
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText(/没有可用的翻译引擎/)).toBeInTheDocument();
    });
    expect(pickBest).toHaveBeenCalled();

    document.body.removeChild(p);
    vi.doUnmock('@core/engines');
    vi.resetModules();
  });
});
