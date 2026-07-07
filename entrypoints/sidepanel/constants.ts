/**
 * SidePanel 常量收口
 *
 * P2-A（审计 v2）：从 App.tsx 抽出的常量，供子组件复用。
 * 保持与原 App.tsx 完全一致的行为，仅是位置迁移。
 */
import type { Engine } from '@engines/types';

export const TARGET_LANGS: Array<{ code: string; label: string }> = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

/**
 * 引擎解析 pending 时的空实现，避免 useTranslate hook 收到 null 抛错。
 * 真正 engine 由 pickBest() resolve 或外部注入。
 *
 * 提到组件外声明，避免每次渲染重建导致 useTranslate 内 useCallback 依赖变化。
 * (Gemini review 建议)
 *
 * 用 Promise.resolve() 而非 async fn，避免 require-await 规则误报。
 */
export const STUB_ENGINE: Engine = {
  id: 'chrome-ai',
  name: 'unavailable',
  priority: 0,
  isAvailable: () => Promise.resolve(false),
  supports: () => false,
  run: () => Promise.resolve(''),
};

export const MAX_CHARS = 5000;
