/**
 * PopupApp 行为单测 · 补齐 coverage
 *
 * 契约：
 * - 挂载后显示品牌 header（校对鸭 + slogan）
 * - "打开侧边栏" 按钮存在，点击调用 chrome.sidePanel.open
 * - "设置" 按钮存在，点击调用 chrome.runtime.openOptionsPage
 * - chrome.* 未定义时优雅降级（不抛异常）
 * - useSelection 返回 selectedText 时展示预览
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PopupApp from '../../../entrypoints/popup/App';

// mock useSelection —— 默认无选中
vi.mock('@hooks/useSelection', () => ({
  useSelection: () => ({ selectedText: '' }),
}));

describe('PopupApp 行为', () => {
  let originalChrome: unknown;

  beforeEach(() => {
    originalChrome = (globalThis as { chrome?: unknown }).chrome;
  });

  afterEach(() => {
    (globalThis as { chrome?: unknown }).chrome = originalChrome;
    vi.restoreAllMocks();
  });

  it('渲染 header + 两个 CTA 按钮', () => {
    render(<PopupApp />);
    expect(screen.getByText('校对鸭')).toBeDefined();
    expect(screen.getByText(/贴心写作小助手/)).toBeDefined();
    expect(screen.getByRole('button', { name: /打开侧边栏/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /设置/ })).toBeDefined();
  });

  it('点击"打开侧边栏"调用 chrome.sidePanel.open', async () => {
    const openSidePanel = vi.fn().mockResolvedValue(undefined);
    const getCurrent = vi.fn().mockResolvedValue({ id: 42 });
    (globalThis as { chrome?: unknown }).chrome = {
      sidePanel: { open: openSidePanel },
      windows: { getCurrent },
      runtime: {},
    };

    render(<PopupApp />);
    fireEvent.click(screen.getByRole('button', { name: /打开侧边栏/ }));

    await waitFor(() => {
      expect(getCurrent).toHaveBeenCalled();
      expect(openSidePanel).toHaveBeenCalledWith({ windowId: 42 });
    });
  });

  it('点击"设置"调用 chrome.runtime.openOptionsPage', () => {
    const openOptionsPage = vi.fn().mockResolvedValue(undefined);
    (globalThis as { chrome?: unknown }).chrome = {
      runtime: { openOptionsPage },
    };

    render(<PopupApp />);
    fireEvent.click(screen.getByRole('button', { name: /设置/ }));

    expect(openOptionsPage).toHaveBeenCalled();
  });

  it('chrome.sidePanel 缺失时不抛异常（非扩展上下文）', () => {
    (globalThis as { chrome?: unknown }).chrome = undefined;
    render(<PopupApp />);

    // 不应抛
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /打开侧边栏/ })),
    ).not.toThrow();
    expect(() => fireEvent.click(screen.getByRole('button', { name: /设置/ }))).not.toThrow();
  });

  it('sidePanel.open 走 windows.getCurrent 分支：win.id undefined 时不调 open', async () => {
    const openSidePanel = vi.fn();
    const getCurrent = vi.fn().mockResolvedValue({ id: undefined });
    (globalThis as { chrome?: unknown }).chrome = {
      sidePanel: { open: openSidePanel },
      windows: { getCurrent },
      runtime: {},
    };

    render(<PopupApp />);
    fireEvent.click(screen.getByRole('button', { name: /打开侧边栏/ }));

    await waitFor(() => expect(getCurrent).toHaveBeenCalled());
    expect(openSidePanel).not.toHaveBeenCalled();
  });

  it('windows.getCurrent 抛错时静默降级（.catch(() => {})）', async () => {
    const openSidePanel = vi.fn();
    const getCurrent = vi.fn().mockRejectedValue(new Error('non-extension context'));
    (globalThis as { chrome?: unknown }).chrome = {
      sidePanel: { open: openSidePanel },
      windows: { getCurrent },
      runtime: {},
    };

    render(<PopupApp />);
    fireEvent.click(screen.getByRole('button', { name: /打开侧边栏/ }));

    // 等下一轮 microtask 完成，验证不会 unhandled rejection
    await new Promise((r) => setTimeout(r, 10));
    expect(openSidePanel).not.toHaveBeenCalled();
  });
});

describe('PopupApp · 选中态', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('有选中文字时显示预览（最多 80 字）', async () => {
    vi.doMock('@hooks/useSelection', () => ({
      useSelection: () => ({ selectedText: '这是一段被选中的示例文本，用于测试 popup 预览区'.repeat(3) }),
    }));

    const mod = await import('../../../entrypoints/popup/App');
    const FreshApp = mod.default;
    render(<FreshApp />);

    expect(screen.getByText('已选中')).toBeDefined();
    vi.doUnmock('@hooks/useSelection');
  });
});
