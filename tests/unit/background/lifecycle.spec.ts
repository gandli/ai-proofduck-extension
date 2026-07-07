/**
 * v0.5.2 · background lifecycle 单测
 *
 * ⚠️ handleCommand 改为**同步函数**：chrome.sidePanel.open 必须在用户手势内
 * 同步调用，任何 await 都会消耗 gesture context。回调直接接收 tab 参数。
 */
import { describe, it, expect, vi } from 'vitest';
import { handleCommand, registerBackground, type ChromeLike } from '../../../src/background/lifecycle';

describe('handleCommand · v0.5.2 快捷键路由（同步）', () => {
  it('open-side-panel 命令 → 立即（同步）调用 sidePanel.open，携带来自 tab 的 windowId', () => {
    const open = vi.fn().mockReturnValue({ catch: () => {} });
    const c: ChromeLike = {
      sidePanel: { open },
    };
    const handled = handleCommand('open-side-panel', c, { windowId: 42 });
    expect(handled).toBe(true);
    expect(open).toHaveBeenCalledWith({ windowId: 42 });
    expect(open).toHaveBeenCalledOnce();
  });

  it('handleCommand 不 await getCurrent（保护用户手势）', () => {
    const getCurrent = vi.fn().mockResolvedValue({ id: 99 });
    const open = vi.fn().mockReturnValue({ catch: () => {} });
    const c: ChromeLike = {
      sidePanel: { open },
      windows: { getCurrent },
    };
    handleCommand('open-side-panel', c, { windowId: 5 });
    // 关键断言：绝不能调用 getCurrent（因为它会消耗 gesture）
    expect(getCurrent).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith({ windowId: 5 });
  });

  it('未知命令返回 false，不做任何调用', () => {
    const open = vi.fn();
    const c: ChromeLike = { sidePanel: { open } };
    const handled = handleCommand('unknown-cmd', c, { windowId: 1 });
    expect(handled).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('tab 缺失 windowId 时不调用 open（防御空上下文）', () => {
    const open = vi.fn();
    const c: ChromeLike = { sidePanel: { open } };
    handleCommand('open-side-panel', c, {});
    handleCommand('open-side-panel', c, undefined);
    expect(open).not.toHaveBeenCalled();
  });

  it('sidePanel.open 抛错时静默不 unhandled reject', () => {
    const rejecting = Promise.reject(new Error('权限被拒'));
    // 主动挂 catch 防 test runner 报 unhandled；等价于我们代码里的 ?.catch?.()
    rejecting.catch(() => {});
    const open = vi.fn().mockReturnValue(rejecting);
    const c: ChromeLike = { sidePanel: { open } };
    expect(() => handleCommand('open-side-panel', c, { windowId: 7 })).not.toThrow();
  });
});

describe('registerBackground · v0.5.2', () => {
  it('注册 chrome.commands.onCommand 监听', () => {
    const addListener = vi.fn();
    const c: ChromeLike = {
      sidePanel: {
        setPanelBehavior: vi.fn().mockResolvedValue(undefined),
      },
      commands: { onCommand: { addListener } },
    };
    registerBackground(c);
    expect(addListener).toHaveBeenCalledOnce();
  });

  it('onCommand 触发时把 tab 参数透传给 handleCommand', () => {
    let cb: ((cmd: string, tab?: { windowId?: number }) => void) | undefined;
    const open = vi.fn().mockReturnValue({ catch: () => {} });
    const c: ChromeLike = {
      sidePanel: { open },
      commands: {
        onCommand: {
          addListener: (fn) => {
            cb = fn;
          },
        },
      },
    };
    registerBackground(c);
    cb?.('open-side-panel', { windowId: 13 });
    expect(open).toHaveBeenCalledWith({ windowId: 13 });
  });

  it('传入 undefined chrome 不抛错', () => {
    expect(() => registerBackground(undefined)).not.toThrow();
  });
});
