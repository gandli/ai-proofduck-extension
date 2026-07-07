/**
 * engine-manager: 引擎注册表 + 优先级仲裁器
 *
 * 职责：
 * - 保存所有已注册的引擎（去重：同 id 后注册的替换前者）
 * - pickBest：按 priority 降序，选第一个 supports(mode?) && isAvailable() 的
 *   传 mode 时会跳过不支持该 mode 的引擎（M3 加 Summarizer 后必要）
 * - pickById：显式指定 id 时直接查表
 *
 * 为什么这个层次要抽象？
 * - 5 个引擎的可用性不同（Chrome AI 要 Chrome 128+、WebLLM 要 WebGPU 显存、API 要网络）
 * - 用户 setDefaultEngine('auto') 时由 manager 挑，'chrome-ai' 时直接指定
 * - 便于测试：注入 stub 引擎即可，无需 mock chrome 内部 API
 */
import type { Engine, EngineId, EngineMode } from '@engines/types';

export interface EngineManager {
  register(engine: Engine): void;
  list(): Engine[];
  pickBest(mode?: EngineMode): Promise<Engine | null>;
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

    async pickBest(mode) {
      // priority 降序遍历，找到第一个既 supports(mode) 又 available 的
      // 若未指定 mode，只按 isAvailable 兜底（历史兼容）
      const sorted = Array.from(engines.values()).sort((a, b) => b.priority - a.priority);
      for (const engine of sorted) {
        if (mode !== undefined && !engine.supports(mode)) continue;
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
