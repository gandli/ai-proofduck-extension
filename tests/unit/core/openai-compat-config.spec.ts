/**
 * openai-compat-config 单元测试
 *
 * 覆盖点：
 *   - get(): 三路 storage 组合
 *   - set(): 三路 storage 并写
 *   - watch(): 任意一项变更都广播全量，返回可 unsubscribe
 *
 * 关键契约：apiKey 必须存 local（不能存 sync）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { openaiCompatConfig } from '@core/openai-compat-config';

describe('openai-compat-config', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('get() 应从 sync + local 组合返回三项配置', async () => {
    await chrome.storage.sync.set({
      'openaiCompat.baseUrl': 'https://api.deepseek.com',
      'openaiCompat.model': 'deepseek-chat',
    });
    await chrome.storage.local.set({ 'openaiCompat.apiKey': 'sk-secret' });

    const cfg = await openaiCompatConfig.get();
    expect(cfg).toEqual({
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'sk-secret',
      model: 'deepseek-chat',
    });
  });

  it('get() 未配置时返回空字符串默认值', async () => {
    const cfg = await openaiCompatConfig.get();
    expect(cfg).toEqual({ baseUrl: '', apiKey: '', model: '' });
  });

  it('set() 应把 apiKey 写到 local，baseUrl/model 写到 sync', async () => {
    await openaiCompatConfig.set({
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-must-be-local',
      model: 'gpt-4',
    });

    const syncData = await chrome.storage.sync.get(null);
    const localData = await chrome.storage.local.get(null);

    expect(syncData['openaiCompat.baseUrl']).toBe('https://api.openai.com');
    expect(syncData['openaiCompat.model']).toBe('gpt-4');
    // ⚠️ apiKey 绝对不能出现在 sync 里
    expect(syncData['openaiCompat.apiKey']).toBeUndefined();
    expect(localData['openaiCompat.apiKey']).toBe('sk-must-be-local');
  });

  it('watch() 任意 storage item 变更都广播全量配置', async () => {
    const cb = vi.fn();
    const unwatch = openaiCompatConfig.watch(cb);

    // 触发 baseUrl 变更 —— cb 应收到全量
    await openaiCompatConfig.set({
      baseUrl: 'https://x.com',
      apiKey: 'k',
      model: 'm',
    });

    // watch 内部是 debounce 触发（三次 set 会各触发一次），等 microtask
    await new Promise((r) => setTimeout(r, 20));

    expect(cb).toHaveBeenCalled();
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0];
    expect(lastCall).toEqual({
      baseUrl: 'https://x.com',
      apiKey: 'k',
      model: 'm',
    });

    unwatch();
  });

  it('watch() 返回的 unsubscribe 应停止后续回调', async () => {
    const cb = vi.fn();
    const unwatch = openaiCompatConfig.watch(cb);

    unwatch();

    await openaiCompatConfig.set({ baseUrl: 'a', apiKey: 'b', model: 'c' });
    await new Promise((r) => setTimeout(r, 20));

    expect(cb).not.toHaveBeenCalled();
  });
});
