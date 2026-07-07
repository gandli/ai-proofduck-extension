/**
 * v0.5.2 · 根据 openai-compat 配置推断 badge 状态
 *
 * 策略：badge 主要提示"用户配置健康"，不是"引擎真的能跑"。
 * - 全空（还没试过 openai-compat）→ ready（其余引擎默认可用）
 * - 部分填了但缺 key/model → warn（用户显然要用但配错了）
 * - 全填齐 → ready
 *
 * 真实引擎健康检查放在 sidepanel/options 里，不在 background 跑（成本高）。
 */
import type { BadgeState } from './badge';

export interface CompatCfgLike {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function deriveBadgeState(cfg: CompatCfgLike): BadgeState {
  const filled = [cfg.baseUrl, cfg.apiKey, cfg.model].filter((v) => v && v.trim().length > 0).length;
  if (filled === 0) return 'ready'; // 用户没碰 openai-compat，其他引擎兜底
  if (filled === 3) return 'ready'; // 齐活
  return 'warn'; // 填了一半 → 提醒
}
