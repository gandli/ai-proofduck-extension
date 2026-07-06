/**
 * openai-compat 配置项
 *
 * 存储策略（延续 storage.ts 里的分区语义）：
 * - baseUrl / model 存 sync（跨设备同步用户偏好）
 * - apiKey 存 **local**（密钥不上云！这是硬约束）
 *
 * 用户在 Options 页填写，Engine 每次 run 都从这里 get()，
 * 用户改 key 不需要重启扩展。
 *
 * 组合 getter：对外只暴露一个 openaiCompatConfig，避免 3 个 storage item 各自消费。
 */
import { defineStorage } from './storage';

const baseUrlItem = defineStorage<string>('openaiCompat.baseUrl', '', { area: 'sync' });
const modelItem = defineStorage<string>('openaiCompat.model', '', { area: 'sync' });
// ⚠️ apiKey 一定用 local，避免 chrome.storage.sync 把密钥同步到用户其他设备
const apiKeyItem = defineStorage<string>('openaiCompat.apiKey', '', { area: 'local' });

export interface OpenAiCompatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const openaiCompatConfig = {
  async get(): Promise<OpenAiCompatConfig> {
    const [baseUrl, apiKey, model] = await Promise.all([
      baseUrlItem.get(),
      apiKeyItem.get(),
      modelItem.get(),
    ]);
    return { baseUrl, apiKey, model };
  },

  async set(cfg: OpenAiCompatConfig): Promise<void> {
    await Promise.all([
      baseUrlItem.set(cfg.baseUrl),
      apiKeyItem.set(cfg.apiKey),
      modelItem.set(cfg.model),
    ]);
  },

  watch(cb: (cfg: OpenAiCompatConfig) => void): () => void {
    // 任意一项变更都重新广播全量配置
    const trigger = () => {
      void openaiCompatConfig.get().then(cb);
    };
    const un1 = baseUrlItem.watch(trigger);
    const un2 = apiKeyItem.watch(trigger);
    const un3 = modelItem.watch(trigger);
    return () => {
      un1();
      un2();
      un3();
    };
  },
};
