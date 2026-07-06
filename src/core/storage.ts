/**
 * storage: chrome.storage 的类型安全封装
 *
 * 为什么需要这层？
 * - chrome.storage.{sync,local} 是 key-value 无类型 API，容易漂移
 * - 分区语义：sync 跨设备同步用户偏好；local 存本机 secrets（API Key 不上云）
 * - 用类似 signal 的接口 get/set/watch，让上层 store 层可以直接消费
 *
 * 使用：
 *   export const theme = defineStorage<'light'|'dark'>('theme', 'light', { area: 'sync' });
 *   export const apiKey = defineStorage<string>('apiKey', '', { area: 'local' });
 */

export type StorageArea = 'local' | 'sync';

export interface StorageItem<T> {
  /** 读取当前值，key 不存在时返回 defaultValue */
  get(): Promise<T>;
  /** 写入新值，等 chrome.storage 完成后 resolve */
  set(value: T): Promise<void>;
  /**
   * 监听值变化。回调签名 (newValue, oldValue)。
   * 返回 unsubscribe 函数。
   */
  watch(cb: (newValue: T, oldValue: T) => void): () => void;
}

export interface StorageOptions {
  area: StorageArea;
}

/**
 * 定义一个类型安全的 storage 项。
 *
 * 内部策略：
 * - get() 直接查 chrome.storage[area]，miss 时 fallback defaultValue
 * - watch() 用 chrome.storage.onChanged 单一监听器，通过 areaName + changes[key] 过滤
 */
export function defineStorage<T>(
  key: string,
  defaultValue: T,
  options: StorageOptions,
): StorageItem<T> {
  const area = options.area;

  return {
    async get() {
      const result = await chrome.storage[area].get(key);
      const value = result[key];
      return value === undefined ? defaultValue : (value as T);
    },

    async set(value: T) {
      await chrome.storage[area].set({ [key]: value });
    },

    watch(cb) {
      const listener = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string,
      ) => {
        if (areaName !== area) return;
        if (!(key in changes)) return;
        const change = changes[key];
        cb(
          (change.newValue as T | undefined) ?? defaultValue,
          (change.oldValue as T | undefined) ?? defaultValue,
        );
      };

      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    },
  };
}
