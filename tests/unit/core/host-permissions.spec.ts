/**
 * host-permissions util
 *
 * 契约：
 * - hasHostPermission(pattern): chrome.permissions.contains 包装
 *   ・ chrome API 缺席 / 抛错 → fail open (true)（测试环境 / MV2 兼容 / 权限 API 关闭时不锁死功能）
 * - requestHostPermission(pattern): chrome.permissions.request 包装
 *   ・ chrome API 缺席 → 抛错（用户操作场景不能静默 true）
 * - onPermissionsChanged(cb): 同时订阅 onAdded + onRemoved，返回 unsubscribe
 *   ・ chrome API 缺席 → no-op（unsubscribe 也不抛）
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  hasHostPermission,
  requestHostPermission,
  onPermissionsChanged,
} from '@core/host-permissions';

interface ChromePermissionsShim {
  contains: (perm: { origins: string[] }) => Promise<boolean>;
  request: (perm: { origins: string[] }) => Promise<boolean>;
  onAdded: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
  onRemoved: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
}

function installChromeMock(shim: Partial<ChromePermissionsShim>) {
  const noopEvent = { addListener: vi.fn(), removeListener: vi.fn() };
  (globalThis as unknown as { chrome: { permissions: ChromePermissionsShim } }).chrome = {
    permissions: {
      contains: shim.contains ?? (async () => true),
      request: shim.request ?? (async () => true),
      onAdded: shim.onAdded ?? noopEvent,
      onRemoved: shim.onRemoved ?? noopEvent,
    },
  };
}

function uninstallChromeMock() {
  delete (globalThis as { chrome?: unknown }).chrome;
}

describe('hasHostPermission', () => {
  afterEach(uninstallChromeMock);

  it('chrome.permissions.contains true → true', async () => {
    installChromeMock({ contains: async () => true });
    expect(await hasHostPermission('https://api.deepseek.com/*')).toBe(true);
  });

  it('chrome.permissions.contains false → false', async () => {
    installChromeMock({ contains: async () => false });
    expect(await hasHostPermission('https://api.deepseek.com/*')).toBe(false);
  });

  it('传入正确的 origins 参数', async () => {
    const contains = vi.fn(async () => true);
    installChromeMock({ contains });
    await hasHostPermission('https://api.groq.com/*');
    expect(contains).toHaveBeenCalledWith({ origins: ['https://api.groq.com/*'] });
  });

  it('chrome API 缺席 → fail open (true)', async () => {
    uninstallChromeMock();
    expect(await hasHostPermission('https://x/*')).toBe(true);
  });

  it('chrome.permissions 缺席 → fail open (true)', async () => {
    (globalThis as { chrome?: unknown }).chrome = {};
    expect(await hasHostPermission('https://x/*')).toBe(true);
  });

  it('contains 抛错 → fail open (true)', async () => {
    installChromeMock({
      contains: async () => {
        throw new Error('extension host down');
      },
    });
    expect(await hasHostPermission('https://x/*')).toBe(true);
  });
});

describe('requestHostPermission', () => {
  afterEach(uninstallChromeMock);

  it('用户同意 → true', async () => {
    installChromeMock({ request: async () => true });
    expect(await requestHostPermission('https://api.groq.com/*')).toBe(true);
  });

  it('用户拒绝 → false', async () => {
    installChromeMock({ request: async () => false });
    expect(await requestHostPermission('https://api.groq.com/*')).toBe(false);
  });

  it('传入正确的 origins 参数', async () => {
    const request = vi.fn(async () => true);
    installChromeMock({ request });
    await requestHostPermission('https://api.mistral.ai/*');
    expect(request).toHaveBeenCalledWith({ origins: ['https://api.mistral.ai/*'] });
  });

  it('chrome API 缺席 → 抛错（不能静默 true）', async () => {
    uninstallChromeMock();
    await expect(requestHostPermission('https://x/*')).rejects.toThrow(/chrome\.permissions/);
  });
});

describe('onPermissionsChanged', () => {
  afterEach(uninstallChromeMock);

  it('注册 onAdded + onRemoved 两个 listener，返回 unsubscribe', () => {
    const addAdded = vi.fn();
    const removeAdded = vi.fn();
    const addRemoved = vi.fn();
    const removeRemoved = vi.fn();
    installChromeMock({
      onAdded: { addListener: addAdded, removeListener: removeAdded },
      onRemoved: { addListener: addRemoved, removeListener: removeRemoved },
    });

    const cb = vi.fn();
    const unsubscribe = onPermissionsChanged(cb);
    expect(addAdded).toHaveBeenCalledWith(cb);
    expect(addRemoved).toHaveBeenCalledWith(cb);

    unsubscribe();
    expect(removeAdded).toHaveBeenCalledWith(cb);
    expect(removeRemoved).toHaveBeenCalledWith(cb);
  });

  it('chrome API 缺席 → no-op，unsubscribe 也不抛', () => {
    uninstallChromeMock();
    const unsubscribe = onPermissionsChanged(() => {});
    expect(() => unsubscribe()).not.toThrow();
  });
});
