/**
 * v0.5.2 · background lifecycle 单测
 */
import { describe, it, expect, vi } from 'vitest';
import { handleCommand, registerBackground, type ChromeLike } from '../../../src/background/lifecycle';

describe('handleCommand · v0.5.2 快捷键路由', () => {
  it('open-side-panel 命令 → 调用 sidePanel.open 并携带 windowId', async () => {
    const open = vi.fn().mockResolvedValue(undefined);
    const c: ChromeLike = {
      sidePanel: { open },
      windows: { getCurrent: async () => ({ id: 42 }) },
    };
    const handled = await handleCommand('open-side-panel', c);
    expect(handled).toBe(true);
    expect(open).toHaveBeenCalledWith({ windowId: 42 });
  });

  it('未知命令返回 false，不做任何调用', async () => {
    const open = vi.fn();
    const c: ChromeLike = { sidePanel: { open }, windows: { getCurrent: async () => ({ id: 1 }) } };
    const handled = await handleCommand('unknown-cmd', c);
    expect(handled).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('windows.getCurrent 无 id 时不调用 open（防御空 window）', async () => {
    const open = vi.fn();
    const c: ChromeLike = {
      sidePanel: { open },
      windows: { getCurrent: async () => ({}) }, // 无 id
    };
    await handleCommand('open-side-panel', c);
    expect(open).not.toHaveBeenCalled();
  });

  it('sidePanel.open 抛错时静默不 unhandled reject', async () => {
    const open = vi.fn().mockRejectedValue(new Error('权限被拒'));
    const c: ChromeLike = {
      sidePanel: { open },
      windows: { getCurrent: async () => ({ id: 7 }) },
    };
    await expect(handleCommand('open-side-panel', c)).resolves.toBe(true);
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

  it('传入 undefined chrome 不抛错', () => {
    expect(() => registerBackground(undefined)).not.toThrow();
  });
});
