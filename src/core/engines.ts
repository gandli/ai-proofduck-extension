/**
 * engines: 全局 EngineManager 单例 + 已注册引擎的自动装配
 *
 * 为什么用单例？
 * - popup / sidepanel / background / options 都要共享同一份注册表
 * - 每处重新 register 一遍冗余且易漂移
 * - 单例保证 "谁先谁后都能拿到全套引擎"
 *
 * 扩展方式：
 *   在 M2 后续 cycle 里，把新引擎 import 进来 registerAll() 即可。
 */
import { createEngineManager } from './engine-manager';
import { createChromeAiEngine } from '@engines/chrome-ai';
import type { EngineManager } from './engine-manager';

let instance: EngineManager | undefined;

export function getEngines(): EngineManager {
  if (!instance) {
    instance = createEngineManager();
    instance.register(createChromeAiEngine());
    // M2 后续 cycle：
    //   instance.register(createWebLlmEngine());
    //   instance.register(createWasmEngine());
    //   instance.register(createOpenAiCompatEngine());
    //   instance.register(createFreeTranslateEngine());
  }
  return instance;
}

/** 测试重置钩子——生产代码不要用 */
export function _resetEnginesForTest(): void {
  instance = undefined;
}
