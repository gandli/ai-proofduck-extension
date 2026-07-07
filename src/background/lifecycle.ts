/**
 * background.ts 里的纯业务函数（跟 wxt defineBackground 解耦，方便单测）
 *
 * v0.5.2 引入 chrome.commands 快捷键：Alt+Shift+P 打开侧边栏
 * chrome.commands.onCommand 只在 background 里触发；我们把 handler 抽出来测。
 */

import { applyBadge, type BadgeAction, type BadgeState } from './badge';
import { deriveBadgeState, type CompatCfgLike } from './badge-state';

export type ChromeLike = {
  sidePanel?: {
    setPanelBehavior?: (opts: { openPanelOnActionClick: boolean }) => Promise<unknown>;
    open?: (opts: { windowId: number }) => Promise<unknown>;
  };
  commands?: {
    onCommand: {
      addListener: (fn: (command: string, tab?: { windowId?: number }) => void) => void;
    };
  };
  windows?: {
    getCurrent: () => Promise<{ id?: number }>;
  };
  action?: BadgeAction;
};

/**
 * 处理快捷键触发的命令
 *
 * ⚠️ chrome.sidePanel.open 必须在用户手势内**同步**调用，
 * 任何 await 都会消耗 gesture context 导致 "may only be called
 * in response to a user gesture" 错误。
 *
 * 因此：
 * - 优先使用 onCommand 回调直接传入的 tab.windowId（同步可得）
 * - 不再 await windows.getCurrent()
 * - open() 立即调用，其返回的 promise 交由调用方 fire-and-forget
 *
 * @returns true 表示识别并触发（无论是否真的打开成功）
 */
export function handleCommand(
  cmd: string,
  c: ChromeLike,
  tab?: { windowId?: number },
): boolean {
  if (cmd !== 'open-side-panel') return false;
  if (!c.sidePanel?.open) return true;
  const windowId = tab?.windowId;
  if (windowId === undefined) return true; // 无窗口上下文，安全返回
  // 同步触发 open()，promise 挂 catch 防 unhandled rejection
  c.sidePanel.open({ windowId })?.catch?.(() => {
    /* 用户拒绝 / 非扩展环境 */
  });
  return true;
}

/**
 * 应用 openai-compat 配置对应的 badge 状态
 * 单独抽出便于 background 拿到 config 后调用 + 单测
 */
export function updateBadgeFromCompat(cfg: CompatCfgLike, c: ChromeLike | undefined): BadgeState {
  const state = deriveBadgeState(cfg);
  applyBadge(state, c?.action);
  return state;
}

/**
 * 注册 background 生命周期钩子（用户调用一次；测试可复用逻辑分支）
 */
export function registerBackground(c: ChromeLike | undefined) {
  if (!c) return;
  // 点击工具栏图标打开 Side Panel
  c.sidePanel
    ?.setPanelBehavior?.({ openPanelOnActionClick: true })
    ?.catch((err: unknown) => console.warn('[proofduck] sidePanel setPanelBehavior failed', err));

  // v0.5.2: 快捷键（Alt+Shift+P）打开 sidePanel
  // 关键：onCommand 回调直接透传 tab 参数，避免 await 消耗用户手势
  c.commands?.onCommand.addListener((cmd, tab) => {
    handleCommand(cmd, c, tab);
  });
}
