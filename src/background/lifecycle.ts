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
      addListener: (fn: (command: string) => void) => void;
    };
  };
  windows?: {
    getCurrent: () => Promise<{ id?: number }>;
  };
  action?: BadgeAction;
};

/**
 * 处理快捷键触发的命令
 * @returns true 表示识别并执行（无论成败），false 表示未识别
 */
export async function handleCommand(cmd: string, c: ChromeLike): Promise<boolean> {
  if (cmd !== 'open-side-panel') return false;
  if (!c.sidePanel?.open) return true; // 识别了但当前上下文不支持，静默
  try {
    const win = await c.windows?.getCurrent();
    if (win?.id !== undefined) {
      await c.sidePanel.open({ windowId: win.id });
    }
  } catch {
    // 忽略：非扩展环境 / 用户拒绝
  }
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
  c.commands?.onCommand.addListener((cmd) => {
    void handleCommand(cmd, c);
  });
}
