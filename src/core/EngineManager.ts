/**
 * EngineManager - 引擎注册与调度中心
 * 负责引擎注册、优先级调度、自动降级
 */

import type { TranslationEngine, EngineInfo, EngineStatus, StreamChunk } from '@/types';

/**
 * 引擎运行错误
 */
export class EngineError extends Error {
  constructor(
    message: string,
    public readonly engineId: string,
    public readonly isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

/**
 * 引擎管理器类
 * 管理所有翻译引擎的注册、调度和自动降级
 */
export class EngineManager {
  private engines: Map<string, TranslationEngine> = new Map();
  private fallbackChain: string[] = [];
  private currentEngineId: string | null = null;

  /**
   * 注册引擎
   */
  register(engine: TranslationEngine): void {
    if (this.engines.has(engine.id)) {
      console.warn(`[EngineManager] Engine "${engine.id}" is already registered. Replacing.`);
    }
    this.engines.set(engine.id, engine);
    this.rebuildFallbackChain();
    console.log(`[EngineManager] Registered engine: ${engine.name} (${engine.id})`);
  }

  /**
   * 注销引擎
   */
  unregister(engineId: string): void {
    if (!this.engines.has(engineId)) {
      console.warn(`[EngineManager] Engine "${engineId}" is not registered.`);
      return;
    }
    this.engines.delete(engineId);
    this.fallbackChain = this.fallbackChain.filter((id) => id !== engineId);
    if (this.currentEngineId === engineId) {
      this.currentEngineId = null;
    }
    console.log(`[EngineManager] Unregistered engine: ${engineId}`);
  }

  /**
   * 获取引擎实例
   */
  getEngine(engineId: string): TranslationEngine | undefined {
    return this.engines.get(engineId);
  }

  /**
   * 获取所有已注册的引擎
   */
  getAllEngines(): TranslationEngine[] {
    return Array.from(this.engines.values());
  }

  /**
   * 获取所有可用引擎（按优先级排序）
   */
  async getAvailableEngines(): Promise<TranslationEngine[]> {
    const engines = Array.from(this.engines.values());
    const availabilityResults = await Promise.all(
      engines.map(async (engine) => {
        try {
          const isAvailable = await engine.checkAvailability();
          return { engine, isAvailable };
        } catch (error) {
          console.warn(`[EngineManager] Engine "${engine.id}" availability check failed:`, error);
          return { engine, isAvailable: false };
        }
      })
    );

    const available = availabilityResults
      .filter((result) => result.isAvailable)
      .map((result) => result.engine);

    // 按优先级降序排序（优先级高的在前）
    return available.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取引擎信息列表
   */
  async getEngineInfos(): Promise<EngineInfo[]> {
    const engines = Array.from(this.engines.values());
    const infos = await Promise.all(
      engines.map(async (engine) => {
        let status: EngineStatus = 'idle';
        let error: string | undefined;

        try {
          const isAvailable = await engine.checkAvailability();
          status = isAvailable ? 'ready' : 'error';
          if (!isAvailable) {
            error = 'Engine not available';
          }
        } catch (err) {
          status = 'error';
          error = err instanceof Error ? err.message : 'Unknown error';
        }

        return {
          id: engine.id,
          name: engine.name,
          status,
          ...(error ? { error } : {}),
        };
      })
    );

    return infos;
  }

  /**
   * 设置当前引擎
   */
  setCurrentEngine(engineId: string): void {
    if (!this.engines.has(engineId)) {
      throw new Error(`Engine "${engineId}" is not registered.`);
    }
    this.currentEngineId = engineId;
  }

  /**
   * 获取当前引擎ID
   */
  getCurrentEngineId(): string | null {
    return this.currentEngineId;
  }

  /**
   * 获取当前引擎
   */
  getCurrentEngine(): TranslationEngine | undefined {
    if (!this.currentEngineId) return undefined;
    return this.engines.get(this.currentEngineId);
  }

  /**
   * 翻译文本 - 使用当前引擎或按优先级自动选择
   */
  async translate(text: string, from: string, to: string): Promise<{ translatedText: string; engine: string }> {
    const engine = await this.selectEngine();
    if (!engine) {
      throw new EngineError('No available translation engine found.', 'none', false);
    }

    try {
      const result = await engine.translate(text, from, to);

      return {
        translatedText: result.translatedText,
        engine: engine.id,
      };
    } catch (error) {
      console.error(`[EngineManager] Engine "${engine.id}" translation failed:`, error);

      // 尝试降级到下一个引擎
      const fallbackEngine = await this.getNextFallbackEngine(engine.id);
      if (fallbackEngine) {
        console.log(`[EngineManager] Falling back to engine: ${fallbackEngine.id}`);
        return this.translateWithEngine(fallbackEngine, text, from, to);
      }

      throw new EngineError(
        error instanceof Error ? error.message : 'Translation failed',
        engine.id,
        true
      );
    }
  }

  /**
   * 流式翻译
   */
  async *streamTranslate(
    text: string,
    from: string,
    to: string
  ): AsyncGenerator<StreamChunk & { engine?: string }> {
    const engine = await this.selectEngine();
    if (!engine) {
      throw new EngineError('No available translation engine found.', 'none', false);
    }

    if (!engine.stream) {
      // 引擎不支持流式，先获取完整结果再逐步返回
      const result = await engine.translate(text, from, to);
      const textToStream = result.translatedText;

      for (let i = 0; i < textToStream.length; i += 10) {
        yield {
          delta: textToStream.slice(i, i + 10),
          done: false,
          engine: engine.id,
        };
      }
      yield { delta: '', done: true, engine: engine.id };
      return;
    }

    try {
      for await (const chunk of engine.stream(text, from, to)) {
        yield { ...chunk, engine: engine.id };
      }
    } catch (error) {
      console.error(`[EngineManager] Engine "${engine.id}" stream failed:`, error);

      // 尝试降级
      const fallbackEngine = await this.getNextFallbackEngine(engine.id);
      if (fallbackEngine) {
        console.log(`[EngineManager] Falling back to engine: ${fallbackEngine.id}`);
        yield* this.streamTranslateWithEngine(fallbackEngine, text, from, to);
      } else {
        throw new EngineError(
          error instanceof Error ? error.message : 'Stream translation failed',
          engine.id,
          true
        );
      }
    }
  }

  /**
   * 使用指定引擎翻译
   */
  private async translateWithEngine(
    engine: TranslationEngine,
    text: string,
    from: string,
    to: string
  ): Promise<{ translatedText: string; engine: string }> {
    const result = await engine.translate(text, from, to);
    return {
      translatedText: result.translatedText,
      engine: engine.id,
    };
  }

  /**
   * 使用指定引擎流式翻译
   */
  private async *streamTranslateWithEngine(
    engine: TranslationEngine,
    text: string,
    from: string,
    to: string
  ): AsyncGenerator<StreamChunk & { engine?: string }> {
    if (!engine.stream) {
      const result = await engine.translate(text, from, to);
      const textToStream = result.translatedText;

      for (let i = 0; i < textToStream.length; i += 10) {
        yield {
          delta: textToStream.slice(i, i + 10),
          done: false,
          engine: engine.id,
        };
      }
      yield { delta: '', done: true, engine: engine.id };
      return;
    }

    for await (const chunk of engine.stream(text, from, to)) {
      yield { ...chunk, engine: engine.id };
    }
  }

  /**
   * 选择最优引擎
   */
  private async selectEngine(): Promise<TranslationEngine | undefined> {
    // 如果有当前引擎且可用，优先使用
    if (this.currentEngineId) {
      const currentEngine = this.engines.get(this.currentEngineId);
      if (currentEngine) {
        try {
          const isAvailable = await currentEngine.checkAvailability();
          if (isAvailable) {
            return currentEngine;
          }
        } catch {
          // 当前引擎不可用，继续选择
        }
      }
    }

    // 获取所有可用引擎并按优先级排序
    const availableEngines = await this.getAvailableEngines();
    return availableEngines[0];
  }

  /**
   * 获取下一个降级引擎
   */
  private async getNextFallbackEngine(currentEngineId: string): Promise<TranslationEngine | undefined> {
    const availableEngines = await this.getAvailableEngines();
    const currentIndex = availableEngines.findIndex((e) => e.id === currentEngineId);

    if (currentIndex >= 0 && currentIndex < availableEngines.length - 1) {
      return availableEngines[currentIndex + 1];
    }

    return undefined;
  }

  /**
   * 重建降级链（按优先级排序）
   */
  private rebuildFallbackChain(): void {
    const engineArray = Array.from(this.engines.values());
    // 按优先级降序排列
    engineArray.sort((a, b) => b.priority - a.priority);
    this.fallbackChain = engineArray.map((e) => e.id);
  }

  /**
   * 检查是否有可用引擎
   */
  async hasAvailableEngine(): Promise<boolean> {
    const available = await this.getAvailableEngines();
    return available.length > 0;
  }

  /**
   * 重置管理器状态
   */
  reset(): void {
    this.currentEngineId = null;
  }
}

// 导出单例
let engineManagerInstance: EngineManager | null = null;

export function getEngineManager(): EngineManager {
  if (!engineManagerInstance) {
    engineManagerInstance = new EngineManager();
  }
  return engineManagerInstance;
}

export function createEngineManager(): EngineManager {
  engineManagerInstance = new EngineManager();
  return engineManagerInstance;
}