/**
 * v0.5.2 · 图标 badge 状态显示
 *
 * 3 态：
 * - ready     → 空文本（无 badge）
 * - warn      → 橙底 "!"（有 API key 需配 / baseUrl 未授权）
 * - error     → 红底 "×"（全部引擎不可用）
 *
 * background 端订阅 engine 状态变化后调用 applyBadge()。
 * 抽出纯函数便于单测。
 */

export type BadgeState = 'ready' | 'warn' | 'error';

export type BadgeAction = {
  setBadgeText: (opts: { text: string }) => void;
  setBadgeBackgroundColor?: (opts: { color: string }) => void;
  setTitle?: (opts: { title: string }) => void;
};

const BADGE_MAP: Record<BadgeState, { text: string; color: string; title: string }> = {
  ready: { text: '', color: '#00000000', title: '校对鸭 · 就绪' },
  warn: { text: '!', color: '#D6A445', title: '校对鸭 · 需配置' },
  error: { text: '×', color: '#C0392B', title: '校对鸭 · 无可用引擎' },
};

export function applyBadge(state: BadgeState, action: BadgeAction | undefined): void {
  if (!action) return;
  const cfg = BADGE_MAP[state];
  action.setBadgeText({ text: cfg.text });
  action.setBadgeBackgroundColor?.({ color: cfg.color });
  action.setTitle?.({ title: cfg.title });
}
