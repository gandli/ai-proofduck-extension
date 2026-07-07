/**
 * Service Worker（v0.5.2 · commands 快捷键 + badge on icon）
 *
 * 业务逻辑抽到 @/background/lifecycle.ts 便于单测。
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
