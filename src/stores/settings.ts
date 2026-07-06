/**
 * settings store: 用户偏好中央存储（Zustand + chrome.storage.sync）
 *
 * 为什么用 Zustand？
 * - 三个入口（popup/sidepanel/options）都要读设置
 * - React 组件外也要能改（如 background 侧 hydrate 完主动 setState）
 * - Zustand 提供 hooks 也提供 store.getState()，两种消费方式都优雅
 *
 * 双向绑定策略：
 * - setXxx() 内存 + storage 同步一次
 * - hydrateSettings() 从 storage 拉最新值填充（启动时调用一次即可）
 * - 【M2 增强】用 storage.watch 订阅外部变化并推回 store
 */
import { create } from 'zustand';
import { defineStorage } from '@core/storage';

export type Theme = 'light' | 'dark' | 'system';
export type Locale = 'zh-CN' | 'en' | 'ja';
export type EngineId = 'auto' | 'chrome-ai' | 'webllm' | 'wasm' | 'openai-compat' | 'free-translate';

// 单个 storage 项，方便测试 & 复用
const themeStore = defineStorage<Theme>('theme', 'system', { area: 'sync' });
const localeStore = defineStorage<Locale>('locale', 'zh-CN', { area: 'sync' });
const defaultEngineStore = defineStorage<EngineId>('defaultEngine', 'auto', { area: 'sync' });

interface SettingsState {
  theme: Theme;
  locale: Locale;
  defaultEngine: EngineId;
  setTheme: (v: Theme) => Promise<void>;
  setLocale: (v: Locale) => Promise<void>;
  setDefaultEngine: (v: EngineId) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  locale: 'zh-CN',
  defaultEngine: 'auto',

  async setTheme(v) {
    set({ theme: v });
    await themeStore.set(v);
  },
  async setLocale(v) {
    set({ locale: v });
    await localeStore.set(v);
  },
  async setDefaultEngine(v) {
    set({ defaultEngine: v });
    await defaultEngineStore.set(v);
  },
}));

/**
 * 从 chrome.storage 拉最新值填充 store。
 * 在每个入口挂载时调用一次（e.g. popup/sidepanel/options 的 main.tsx）。
 */
export async function hydrateSettings() {
  const [theme, locale, defaultEngine] = await Promise.all([
    themeStore.get(),
    localeStore.get(),
    defaultEngineStore.get(),
  ]);
  useSettingsStore.setState({ theme, locale, defaultEngine });
}
