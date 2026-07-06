/**
 * TranslationCache 单元测试
 *
 * Jules #455 提出了 LRU + TTL 缓存的思路，感谢；本实现是采纳后完善版：
 * - 用 fake timers 精确测 TTL（避免真等 1 小时）
 * - 补 delete / has / size 观察点
 * - 明确 max=0 边界
 * - key 派生：mode + source + target + text（业务侧使用姿势）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslationCache, makeCacheKey } from '@utils/cache';

describe('TranslationCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T00:00:00Z'));
  });

  it('初始化后 size=0', () => {
    const c = new TranslationCache();
    expect(c.size).toBe(0);
  });

  it('set + get 命中', () => {
    const c = new TranslationCache();
    c.set('k1', 'v1');
    expect(c.get('k1')).toBe('v1');
    expect(c.size).toBe(1);
  });

  it('miss 返回 undefined', () => {
    const c = new TranslationCache();
    expect(c.get('nope')).toBeUndefined();
  });

  it('TTL 到期后自动过期 → miss + 从底层 Map 移除', () => {
    const c = new TranslationCache({ ttlMs: 1000 });
    c.set('k', 'v');
    expect(c.get('k')).toBe('v');

    vi.advanceTimersByTime(1001);
    expect(c.get('k')).toBeUndefined();
    expect(c.size).toBe(0);
  });

  it('LRU：get 命中会刷新条目到"最近"位置', () => {
    const c = new TranslationCache({ maxSize: 3 });
    c.set('a', '1');
    c.set('b', '2');
    c.set('c', '3');
    // 触碰 a，让 a 变成最新
    c.get('a');
    // 再塞一个 → 应淘汰最老的 b（不是 a）
    c.set('d', '4');

    expect(c.get('a')).toBe('1');
    expect(c.get('b')).toBeUndefined();
    expect(c.get('c')).toBe('3');
    expect(c.get('d')).toBe('4');
  });

  it('LRU：超过 maxSize 淘汰最旧', () => {
    const c = new TranslationCache({ maxSize: 2 });
    c.set('a', '1');
    c.set('b', '2');
    c.set('c', '3');
    expect(c.get('a')).toBeUndefined();
    expect(c.size).toBe(2);
  });

  it('set 已有 key 会更新值并刷新 LRU 位置', () => {
    const c = new TranslationCache({ maxSize: 2 });
    c.set('a', '1');
    c.set('b', '2');
    c.set('a', '11'); // 更新 a 且刷新位置
    c.set('c', '3'); // 淘汰 b 而不是 a
    expect(c.get('a')).toBe('11');
    expect(c.get('b')).toBeUndefined();
    expect(c.get('c')).toBe('3');
  });

  it('clear 清空全部', () => {
    const c = new TranslationCache();
    c.set('a', '1');
    c.set('b', '2');
    c.clear();
    expect(c.size).toBe(0);
    expect(c.get('a')).toBeUndefined();
  });

  it('has(): TTL 检测 + 不刷新 LRU', () => {
    const c = new TranslationCache({ maxSize: 2, ttlMs: 1000 });
    c.set('a', '1');
    c.set('b', '2');
    // has(a) 不刷新，所以后续 set c 应淘汰 a
    expect(c.has('a')).toBe(true);
    c.set('c', '3');
    expect(c.has('a')).toBe(false);
    expect(c.has('b')).toBe(true);
  });

  it('has(): 过期条目返回 false', () => {
    const c = new TranslationCache({ ttlMs: 500 });
    c.set('a', '1');
    vi.advanceTimersByTime(600);
    expect(c.has('a')).toBe(false);
  });

  it('maxSize=0 → 完全禁用缓存', () => {
    const c = new TranslationCache({ maxSize: 0 });
    c.set('a', '1');
    expect(c.get('a')).toBeUndefined();
    expect(c.size).toBe(0);
  });
});

describe('makeCacheKey', () => {
  it('相同参数 → 相同 key', () => {
    const k1 = makeCacheKey({ mode: 'translate', sourceLang: 'en', targetLang: 'zh', text: 'hi' });
    const k2 = makeCacheKey({ mode: 'translate', sourceLang: 'en', targetLang: 'zh', text: 'hi' });
    expect(k1).toBe(k2);
  });

  it('不同 text → 不同 key', () => {
    const k1 = makeCacheKey({ mode: 'translate', sourceLang: 'en', targetLang: 'zh', text: 'hi' });
    const k2 = makeCacheKey({ mode: 'translate', sourceLang: 'en', targetLang: 'zh', text: 'bye' });
    expect(k1).not.toBe(k2);
  });

  it('不同 mode / 语言对 → 不同 key', () => {
    const base = { mode: 'translate' as const, sourceLang: 'en', targetLang: 'zh', text: 'hi' };
    expect(makeCacheKey({ ...base, mode: 'summarize' })).not.toBe(makeCacheKey(base));
    expect(makeCacheKey({ ...base, sourceLang: 'ja' })).not.toBe(makeCacheKey(base));
    expect(makeCacheKey({ ...base, targetLang: 'fr' })).not.toBe(makeCacheKey(base));
  });

  it('省略语言字段 → 视为 auto', () => {
    const k1 = makeCacheKey({ mode: 'translate', text: 'hi', sourceLang: 'auto', targetLang: 'zh' });
    const k2 = makeCacheKey({ mode: 'translate', text: 'hi', targetLang: 'zh' });
    expect(k1).toBe(k2);
  });
});
