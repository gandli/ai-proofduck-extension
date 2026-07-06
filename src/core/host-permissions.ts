/**
 * host-permissions: chrome.permissions API 的轻量包装
 *
 * 设计要点：
 * - hasHostPermission / onPermissionsChanged 在 chrome API 缺席时 **fail open**：
 *   测试环境 / MV2 兼容 / 权限 API 关闭时不应把功能锁死。这与「先判权限再决定 UX」
 *   的设计相配 —— 缺 chrome 环境时（如 Vitest happy-dom）默认放行，
 *   由更上层的 isAvailable 用其他条件（storage 里配置齐不齐）兜底。
 * - requestHostPermission 反过来：在 chrome API 缺席时 **抛错**。
 *   因为它必须在真实用户手势里被调用（Chrome 强制），静默 true 会掩盖 bug。
 */

// 单一 origin 走单一 pattern，简化 API；后续需要批量再扩展
type PermissionListener = () => void;

interface ChromePermissionsAPI {
  contains?: (perm: { origins: string[] }) => Promise<boolean>;
  request?: (perm: { origins: string[] }) => Promise<boolean>;
  onAdded?: {
    addListener: (cb: PermissionListener) => void;
    removeListener: (cb: PermissionListener) => void;
  };
  onRemoved?: {
    addListener: (cb: PermissionListener) => void;
    removeListener: (cb: PermissionListener) => void;
  };
}

function getPermissionsAPI(): ChromePermissionsAPI | null {
  const c = (globalThis as { chrome?: { permissions?: ChromePermissionsAPI } }).chrome;
  if (!c || !c.permissions) return null;
  return c.permissions;
}

/**
 * 检查扩展是否已获得对该 pattern 的 host 权限。
 *
 * chrome API 缺席 / 调用抛错时返回 true（fail open）。
 */
export async function hasHostPermission(pattern: string): Promise<boolean> {
  const api = getPermissionsAPI();
  if (!api || !api.contains) return true;
  try {
    return await api.contains({ origins: [pattern] });
  } catch {
    return true;
  }
}

/**
 * 向用户请求 host 权限。**必须**在用户手势 handler 里调用。
 *
 * chrome API 缺席时抛错（不能静默 true）。
 */
export async function requestHostPermission(pattern: string): Promise<boolean> {
  const api = getPermissionsAPI();
  if (!api || !api.request) {
    throw new Error('chrome.permissions API 不可用（此环境不支持运行时权限请求）');
  }
  return api.request({ origins: [pattern] });
}

/**
 * 订阅权限增删事件。返回 unsubscribe 函数。
 *
 * chrome API 缺席时 no-op，unsubscribe 也 no-op。
 */
export function onPermissionsChanged(cb: PermissionListener): () => void {
  const api = getPermissionsAPI();
  if (!api) return () => {};
  const added = api.onAdded;
  const removed = api.onRemoved;
  added?.addListener(cb);
  removed?.addListener(cb);
  return () => {
    added?.removeListener(cb);
    removed?.removeListener(cb);
  };
}
