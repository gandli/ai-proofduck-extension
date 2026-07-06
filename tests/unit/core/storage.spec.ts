/**
 * storage 单元测试
 *
 * 设计动机：
 * - chrome.storage.local/sync 是回调式 + any 类型，直接用非常笨
 * - 我们要一个类型安全的 defineStorage()，行为类似 signal：get/set/watch
 * - 分区隔离：settings 用 sync（跨设备），secrets 用 local（本机 API Key 不同步）
 *
 * 契约：
 * 1. defineStorage(key, defaultValue, { area }) 返回 { get, set, watch }
 * 2. 首次 get() 返回 defaultValue
 * 3. set(v) 后 get() 返回 v
 * 4. watch(cb) 在 set 时触发，返回 unsubscribe
 * 5. area 决定用 sync 还是 local
 */
import { describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { defineStorage } from '@core/storage';

describe('storage', () => {
  it('首次读取返回 defaultValue', async () => {
    const theme = defineStorage<'light' | 'dark' | 'system'>('theme', 'system', { area: 'sync' });
    expect(await theme.get()).toBe('system');
  });

  it('set 之后 get 返回新值', async () => {
    const theme = defineStorage<'light' | 'dark'>('theme', 'light', { area: 'sync' });
    await theme.set('dark');
    expect(await theme.get()).toBe('dark');
  });

  it('secrets 用 local area，与 sync 分区隔离', async () => {
    const apiKey = defineStorage<string>('apiKey', '', { area: 'local' });
    await apiKey.set('sk-secret');

    // sync 里不应看到（同 key，area 不同）
    const syncResult = await fakeBrowser.storage.sync.get('apiKey');
    const localResult = await fakeBrowser.storage.local.get('apiKey');

    expect(syncResult.apiKey).toBeUndefined();
    expect(localResult.apiKey).toBe('sk-secret');
  });

  it('watch(cb) 在 set 时触发回调，回调收到新旧值', async () => {
    const theme = defineStorage<'light' | 'dark'>('theme', 'light', { area: 'sync' });
    const cb = vi.fn();
    theme.watch(cb);

    await theme.set('dark');
    // 等一轮 microtask 让 chrome.storage.onChanged 触发
    await new Promise((r) => setTimeout(r, 0));

    expect(cb).toHaveBeenCalledWith('dark', 'light');
  });

  it('watch 返回的 unsubscribe 生效', async () => {
    const theme = defineStorage<'light' | 'dark'>('theme', 'light', { area: 'sync' });
    const cb = vi.fn();
    const unsub = theme.watch(cb);
    unsub();

    await theme.set('dark');
    await new Promise((r) => setTimeout(r, 0));

    expect(cb).not.toHaveBeenCalled();
  });

  it('key 只监听自身，不会被别的 key 变化触发', async () => {
    const theme = defineStorage<'light'>('theme', 'light', { area: 'sync' });
    const otherKey = defineStorage<number>('other', 0, { area: 'sync' });
    const themeCb = vi.fn();
    theme.watch(themeCb);

    await otherKey.set(42);
    await new Promise((r) => setTimeout(r, 0));

    expect(themeCb).not.toHaveBeenCalled();
  });
});
