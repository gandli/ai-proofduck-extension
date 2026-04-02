/**
 * 翻译结果缓存模块
 * 使用 LRU 缓存策略，减少重复翻译请求
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 分钟
const DEFAULT_MAX_SIZE = 100;

/**
 * 创建基于文本哈希的缓存
 */
export class TranslationCache {
  private cache: Map<string, CacheEntry<string>>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = DEFAULT_MAX_SIZE, ttl = DEFAULT_TTL) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * 生成缓存键
   */
  private generateKey(text: string, mode: string): string {
    // 使用文本长度 + 哈希前 50 字符作为键
    const hash = this.simpleHash(text);
    return `${mode}:${text.length}:${hash}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 100); i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取缓存值
   */
  get(text: string, mode: string): string | null {
    const key = this.generateKey(text, mode);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(text: string, mode: string, value: string): void {
    const key = this.generateKey(text, mode);

    // 如果缓存已满，删除最老的条目
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }
}

// 全局缓存实例
export const translationCache = new TranslationCache();