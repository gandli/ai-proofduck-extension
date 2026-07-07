/**
 * TranslationCache: LRU + TTL 翻译结果缓存
 *
 * 采纳 Jules AI #455 的思路，改进：
 * - 用 Map 迭代顺序 + delete/set 实现 LRU（O(1)）
 * - 明确 has() 语义（TTL 检测但不刷新 LRU）
 * - 暴露 size / has 便于测试观察
 * - 加 makeCacheKey 帮 hook 层组装稳定的缓存键
 * - maxSize=0 语义化为"禁用"
 *
 * 使用场景：
 * - 同一段文本反复翻译（用户点两次按钮 / 重复选中同一句）→ 秒回避免重跑模型
 * - Chrome AI / WebLLM / openai-compat 都受益
 */

export interface CacheEntry<T> {
  value: T;
  /** 写入时的 epoch ms，用于 TTL 判定 */
  writtenAt: number;
}

export interface TranslationCacheOptions {
  /** 最多缓存多少条；<=0 表示禁用 */
  maxSize?: number;
  /** 单条 TTL（毫秒），默认 1 小时 */
  ttlMs?: number;
}

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1h

export class TranslationCache {
  private readonly store: Map<string, CacheEntry<string>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(opts: TranslationCacheOptions = {}) {
    this.store = new Map();
    this.maxSize = opts.maxSize ?? DEFAULT_MAX_SIZE;
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  }

  get size(): number {
    return this.store.size;
  }

  get(key: string): string | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }

    // LRU：命中就刷到"最新"位置
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * 查询存在性：会检测 TTL 并清理过期条目，但**不**刷新 LRU 位置
   * （区别于 get，避免"探测"操作意外让条目续命）
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  set(key: string, value: string): void {
    if (this.maxSize <= 0) return; // 显式禁用

    if (this.store.has(key)) {
      // 更新旧值 + 刷新到最新
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      // 淘汰最旧（Map 迭代顺序即插入顺序）
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }

    this.store.set(key, { value, writtenAt: Date.now() });
  }

  clear(): void {
    this.store.clear();
  }

  private isExpired(entry: CacheEntry<string>): boolean {
    return Date.now() - entry.writtenAt > this.ttlMs;
  }
}

/**
 * 缓存键组装：engineId + model + mode + 语言对 + 文本
 *
 * v0.5.3 P1-3：加入 engineId + model 两个维度。
 * 原因：不同引擎（chrome-ai / webllm / openai-compat）翻译同一句结果不同；
 * 同一 openai-compat 换 model（gpt-4o vs qwen-turbo）结果也不同。
 * 不加会跨引擎/跨模型污染缓存 → 用户切模型秒回旧结果，以为新模型没生效。
 *
 * 语言字段省略时归一化为 'auto'，让 UI 层的 sourceLang=undefined
 * 和显式选 'auto' 命中同一条缓存。
 *
 * engineId / model 省略也归一化为 'default'，向后兼容老调用点。
 */
export function makeCacheKey(input: {
  mode: string;
  text: string;
  sourceLang?: string;
  targetLang?: string;
  engineId?: string;
  model?: string;
}): string {
  const engine = input.engineId ?? 'default';
  const model = input.model ?? 'default';
  const source = input.sourceLang ?? 'auto';
  const target = input.targetLang ?? 'auto';
  return `${engine}|${model}|${input.mode}|${source}|${target}|${input.text}`;
}
