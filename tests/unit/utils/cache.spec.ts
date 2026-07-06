import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TranslationCache } from '../../../src/utils/cache';

describe('TranslationCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set and get values', () => {
    const cache = new TranslationCache();
    cache.set('hello', 'world');
    expect(cache.get('hello')).toBe('world');
  });

  it('should return undefined for missing keys', () => {
    const cache = new TranslationCache();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should respect TTL and expire old entries', () => {
    const ttl = 1000;
    const cache = new TranslationCache(100, ttl);

    cache.set('hello', 'world');
    expect(cache.get('hello')).toBe('world');

    // Advance time past TTL
    vi.advanceTimersByTime(ttl + 1);

    expect(cache.get('hello')).toBeUndefined();
  });

  it('should refresh LRU order on get', () => {
    const cache = new TranslationCache(2);

    cache.set('k1', 'v1');
    cache.set('k2', 'v2');

    // Access k1 so it becomes the most recently used
    cache.get('k1');

    // Add a new item, which should evict k2 since it's the oldest now
    cache.set('k3', 'v3');

    expect(cache.get('k2')).toBeUndefined();
    expect(cache.get('k1')).toBe('v1');
    expect(cache.get('k3')).toBe('v3');
  });

  it('should overwrite existing keys and update LRU order', () => {
    const cache = new TranslationCache(2);

    cache.set('k1', 'v1');
    cache.set('k2', 'v2');

    // Overwrite k1, making it most recently used
    cache.set('k1', 'v1-new');

    cache.set('k3', 'v3');

    // k2 should be evicted
    expect(cache.get('k2')).toBeUndefined();
    expect(cache.get('k1')).toBe('v1-new');
    expect(cache.get('k3')).toBe('v3');
  });

  it('should clear the cache', () => {
    const cache = new TranslationCache();

    cache.set('k1', 'v1');
    cache.set('k2', 'v2');

    cache.clear();

    expect(cache.get('k1')).toBeUndefined();
    expect(cache.get('k2')).toBeUndefined();
  });
});
