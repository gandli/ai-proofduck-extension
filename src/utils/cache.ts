export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

export class TranslationCache {
  private cache: Map<string, CacheEntry<string>>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = DEFAULT_MAX_SIZE, ttl = DEFAULT_TTL) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}
