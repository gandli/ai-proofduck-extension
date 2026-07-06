/**
 * engine-manager: 引擎注册表 + 优先级仲裁器
 *
 * 职责：
 * - 保存所有已注册的引擎（去重：同 id 后注册的替换前者）
 * - pickBest：按 priority 降序，选第一个 isAvailable() 为 true 的
 * - pickById：显式指定 id 时直接查表
 *
 * 为什么这个层次要抽象？
 * - 5 个引擎的可用性不同（Chrome AI 要 Chrome 128+、WebLLM 要 WebGPU 显存、API 要网络）
 * - 用户 setDefaultEngine('auto') 时由 manager 挑，'chrome-ai' 时直接指定
 * - 便于测试：注入 stub 引擎即可，无需 mock chrome 内部 API
 */
import type { Engine, EngineId } from '@engines/types';

export interface EngineManager {
  register(engine: Engine): void;
  list(): Engine[];
  pickBest(): Promise<Engine | null>;
  pickById(id: EngineId): Engine | null;
}

export function createEngineManager(): EngineManager {
  const engines = new Map<EngineId, Engine>();

  return {
    register(engine) {
      engines.set(engine.id, engine); // 同 id 覆盖，天然去重
    },

    list() {
      return Array.from(engines.values());
    },

    async pickBest() {
      // priority 降序遍历，找到第一个 available 的
      const sorted = Array.from(engines.values()).sort((a, b) => b.priority - a.priority);
      for (const engine of sorted) {
        if (await engine.isAvailable()) {
          return engine;
        }
      }
      return null;
    },

    pickById(id) {
      return engines.get(id) ?? null;
    },
  };
}
