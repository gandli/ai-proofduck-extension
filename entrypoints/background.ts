/**
 * WXT Service Worker 壳文件（v0.5.3 · commands 快捷键 + badge on icon）
 *
 * ⚠️ 本文件仅做 `defineBackground` 入口壳：
 * - 不允许在此写业务逻辑（否则 vitest 无法直接 import 测试）
 * - 所有可测模块必须放到 `src/background/*.ts`（lifecycle / badge / badge-state 已抽）
 * - 新增 background 副作用 → 先在 `src/background/` 写函数并加单测，再在这里调用
 *
 * v0.5.3 审计 P3-D：明确此规约，防止 shim 变成"回归垃圾场"。
 */
import { registerBackground, updateBadgeFromCompat } from '../src/background/lifecycle';
import { openaiCompatConfig } from '../src/core/openai-compat-config';

export default defineBackground(() => {
  const c = (globalThis as { chrome?: typeof chrome }).chrome;
  registerBackground(c);

  // v0.5.2: 首次同步 + watch openai-compat 配置 → 更新 icon badge
  void openaiCompatConfig.get().then((cfg) => {
    updateBadgeFromCompat(cfg, c);
  });
  openaiCompatConfig.watch((cfg) => {
    updateBadgeFromCompat(cfg, c);
  });
});
