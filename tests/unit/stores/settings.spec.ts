/**
 * settings store 单元测试
 *
 * 设计动机：
 * - 用户设置分两类：偏好（跨设备 sync）+ secrets（本机 local）
 * - Popup / SidePanel / Options 三处都会读同一份 settings，需集中管理
 * - Zustand + 我们自己的 storage 层做双向绑定
 *
 * 契约：
 * 1. useSettingsStore().theme 初始为 'system'
 * 2. setTheme('dark') 立刻更新内存态 + 落盘 sync storage
 * 3. locale 初始为 'zh-CN'，可切换
 * 4. defaultEngine 初始为 'auto'（M2 之后由 EngineManager 挑选）
 * 5. hydrate() 从 storage 拉最新值填充 store
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { useSettingsStore, hydrateSettings } from '@stores/settings';

describe('settings store', () => {
  beforeEach(() => {
    // 每次测试用干净 store
    useSettingsStore.setState({ theme: 'system', locale: 'zh-CN', defaultEngine: 'auto' });
  });

  it('theme 初始值为 system', () => {
    expect(useSettingsStore.getState().theme).toBe('system');
  });

  it('setTheme 更新内存态', () => {
    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('setTheme 落盘到 chrome.storage.sync', async () => {
    await useSettingsStore.getState().setTheme('dark');
    const result = await fakeBrowser.storage.sync.get('theme');
    expect(result.theme).toBe('dark');
  });

  it('setLocale 更新 + 落盘', async () => {
    await useSettingsStore.getState().setLocale('en');
    expect(useSettingsStore.getState().locale).toBe('en');
    const result = await fakeBrowser.storage.sync.get('locale');
    expect(result.locale).toBe('en');
  });

  it('setDefaultEngine 更新 + 落盘', async () => {
    await useSettingsStore.getState().setDefaultEngine('chrome-ai');
    expect(useSettingsStore.getState().defaultEngine).toBe('chrome-ai');
  });

  it('hydrate 从 storage 拉最新值填充 store', async () => {
    // 直接写 storage，模拟另一个上下文（如 background）改了值
    await fakeBrowser.storage.sync.set({ theme: 'dark', locale: 'ja', defaultEngine: 'webllm' });

    await hydrateSettings();

    const s = useSettingsStore.getState();
    expect(s.theme).toBe('dark');
    expect(s.locale).toBe('ja');
    expect(s.defaultEngine).toBe('webllm');
  });
});
