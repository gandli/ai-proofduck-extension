/**
 * EngineManager 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EngineManager,
  EngineError,
  getEngineManager,
  createEngineManager,
} from '@/core/EngineManager';
import type { TranslationEngine, TranslationResult } from '@/types';

// Mock engine factory
function createMockEngine(config: {
  id: string;
  name: string;
  priority?: number;
  available?: boolean;
  translateDelay?: number;
  shouldFail?: boolean;
}): TranslationEngine {
  const baseEngine = {
    id: config.id,
    name: config.name,
    category: 'translation' as const,
    priority: config.priority ?? 10,
    capabilities: {
      supportedLanguages: ['en', 'zh', 'ja'],
      maxTextLength: 5000,
    },
    checkAvailability: vi.fn().mockResolvedValue(config.available ?? true),
    translate: vi.fn().mockImplementation(async () => {
      if (config.shouldFail) {
        throw new Error(`Engine ${config.id} failed`);
      }
      if (config.translateDelay) {
        await new Promise((resolve) => setTimeout(resolve, config.translateDelay));
      }
      return {
        translatedText: `Translated by ${config.name}`,
        engine: config.id,
        duration: 100,
      } as TranslationResult;
    }),
  };

  // Only add stream if not shouldFail
  if (!config.shouldFail) {
    return {
      ...baseEngine,
      stream: vi.fn().mockImplementation(async function* () {
        const text = `Streaming ${config.name}`;
        for (let i = 0; i < text.length; i += 5) {
          yield { delta: text.slice(i, i + 5), done: false };
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        yield { delta: '', done: true };
      }),
    };
  }

  return baseEngine;
}

describe('EngineManager', () => {
  let manager: EngineManager;

  beforeEach(() => {
    // 创建新实例以避免状态污染
    manager = createEngineManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.reset();
  });

  describe('注册与注销', () => {
    it('应该正确注册引擎', () => {
      const engine = createMockEngine({ id: 'test', name: 'Test Engine' });
      manager.register(engine);

      const retrieved = manager.getEngine('test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Engine');
    });

    it('应该允许重复注册并替换引擎', () => {
      const engine1 = createMockEngine({ id: 'test', name: 'Engine 1' });
      const engine2 = createMockEngine({ id: 'test', name: 'Engine 2' });

      manager.register(engine1);
      manager.register(engine2);

      const retrieved = manager.getEngine('test');
      expect(retrieved?.name).toBe('Engine 2');
    });

    it('应该正确注销引擎', () => {
      const engine = createMockEngine({ id: 'test', name: 'Test Engine' });
      manager.register(engine);
      manager.unregister('test');

      const retrieved = manager.getEngine('test');
      expect(retrieved).toBeUndefined();
    });

    it('注销不存在的引擎应该不抛错', () => {
      expect(() => manager.unregister('nonexistent')).not.toThrow();
    });

    it('应该返回所有已注册的引擎', () => {
      const engine1 = createMockEngine({ id: 'eng1', name: 'Engine 1' });
      const engine2 = createMockEngine({ id: 'eng2', name: 'Engine 2' });

      manager.register(engine1);
      manager.register(engine2);

      const allEngines = manager.getAllEngines();
      expect(allEngines).toHaveLength(2);
    });
  });

  describe('引擎选择', () => {
    it('应该按优先级排序可用引擎', async () => {
      const engine1 = createMockEngine({
        id: 'low',
        name: 'Low Priority',
        priority: 1,
      });
      const engine2 = createMockEngine({
        id: 'high',
        name: 'High Priority',
        priority: 100,
      });

      manager.register(engine1);
      manager.register(engine2);

      const available = await manager.getAvailableEngines();
      expect(available.length).toBeGreaterThanOrEqual(2);
      expect(available[0]!.id).toBe('high');
      expect(available[1]!.id).toBe('low');
    });

    it('应该跳过不可用的引擎', async () => {
      const engine1 = createMockEngine({
        id: 'available',
        name: 'Available',
        available: true,
        priority: 1,
      });
      const engine2 = createMockEngine({
        id: 'unavailable',
        name: 'Unavailable',
        available: false,
        priority: 100,
      });

      manager.register(engine1);
      manager.register(engine2);

      const available = await manager.getAvailableEngines();
      expect(available.length).toBeGreaterThanOrEqual(1);
      expect(available[0]!.id).toBe('available');
    });

    it('应该优先使用当前选中的引擎', async () => {
      const engine1 = createMockEngine({
        id: 'current',
        name: 'Current Engine',
        priority: 1,
      });
      const engine2 = createMockEngine({
        id: 'other',
        name: 'Other Engine',
        priority: 100,
      });

      manager.register(engine1);
      manager.register(engine2);
      manager.setCurrentEngine('current');

      const current = manager.getCurrentEngine();
      expect(current?.id).toBe('current');
    });

    it('设置不存在的引擎ID应该抛错', () => {
      expect(() => manager.setCurrentEngine('nonexistent')).toThrow();
    });
  });

  describe('翻译功能', () => {
    it('应该使用最高优先级引擎翻译', async () => {
      const engine1 = createMockEngine({ id: 'eng1', name: 'Engine 1', priority: 1 });
      const engine2 = createMockEngine({ id: 'eng2', name: 'Engine 2', priority: 100 });

      manager.register(engine1);
      manager.register(engine2);

      const result = await manager.translate('Hello', 'en', 'zh');

      expect(result.engine).toBe('eng2');
      expect(result.translatedText).toBe('Translated by Engine 2');
    });

    it('当引擎失败时应该自动降级', async () => {
      const engine1 = createMockEngine({
        id: 'primary',
        name: 'Primary',
        priority: 100,
        shouldFail: true,
      });
      const engine2 = createMockEngine({
        id: 'fallback',
        name: 'Fallback',
        priority: 50,
      });

      manager.register(engine1);
      manager.register(engine2);

      const result = await manager.translate('Hello', 'en', 'zh');

      expect(result.engine).toBe('fallback');
    });

    it('当没有可用引擎时应该抛错', async () => {
      const engine = createMockEngine({
        id: 'engine',
        name: 'Engine',
        available: false,
      });

      manager.register(engine);

      await expect(manager.translate('Hello', 'en', 'zh')).rejects.toThrow(
        'No available translation engine found'
      );
    });
  });

  describe('流式翻译', () => {
    it('应该支持流式输出', async () => {
      const engine = createMockEngine({ id: 'stream', name: 'Stream Engine' });

      manager.register(engine);

      const chunks: string[] = [];
      for await (const chunk of manager.streamTranslate('Hello', 'en', 'zh')) {
        chunks.push(chunk.delta);
      }

      const fullText = chunks.join('');
      expect(fullText).toContain('Streaming');
    });

    it('对于不支持流的引擎应该模拟流式输出', async () => {
      const engine: TranslationEngine = {
        id: 'nosteam',
        name: 'No Stream Engine',
        category: 'translation',
        priority: 10,
        capabilities: {
          supportedLanguages: ['en', 'zh'],
          maxTextLength: 5000,
        },
        checkAvailability: vi.fn().mockResolvedValue(true),
        translate: vi.fn().mockResolvedValue({
          translatedText: 'Full translation result',
          engine: 'nosteam',
        }),
        // 没有 stream 方法
      };

      manager.register(engine);

      const chunks: string[] = [];
      for await (const chunk of manager.streamTranslate('Hello', 'en', 'zh')) {
        chunks.push(chunk.delta);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('引擎信息', () => {
    it('应该返回所有引擎信息', async () => {
      const engine = createMockEngine({
        id: 'test',
        name: 'Test Engine',
        available: true,
      });

      manager.register(engine);

      const infos = await manager.getEngineInfos();

      expect(infos).toHaveLength(1);
      expect(infos[0]!.id).toBe('test');
      expect(infos[0]!.status).toBe('ready');
    });

    it('应该标记不可用引擎的状态为 error', async () => {
      const engine = createMockEngine({
        id: 'test',
        name: 'Test Engine',
        available: false,
      });

      manager.register(engine);

      const infos = await manager.getEngineInfos();

      expect(infos[0]!.status).toBe('error');
    });
  });

  describe('hasAvailableEngine', () => {
    it('应该有可用引擎时返回 true', async () => {
      const engine = createMockEngine({ id: 'test', name: 'Test', available: true });
      manager.register(engine);

      const result = await manager.hasAvailableEngine();
      expect(result).toBe(true);
    });

    it('没有可用引擎时返回 false', async () => {
      const engine = createMockEngine({ id: 'test', name: 'Test', available: false });
      manager.register(engine);

      const result = await manager.hasAvailableEngine();
      expect(result).toBe(false);
    });

    it('没有任何引擎时返回 false', async () => {
      const result = await manager.hasAvailableEngine();
      expect(result).toBe(false);
    });
  });

  describe('EngineError', () => {
    it('应该正确创建错误对象', () => {
      const error = new EngineError('Test error', 'test-engine', true);

      expect(error.message).toBe('Test error');
      expect(error.engineId).toBe('test-engine');
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('EngineError');
    });

    it('应该支持不可重试错误', () => {
      const error = new EngineError('Fatal error', 'test-engine', false);

      expect(error.isRetryable).toBe(false);
    });
  });

  describe('单例模式', () => {
    it('getEngineManager 应该返回单例', () => {
      const instance1 = getEngineManager();
      const instance2 = getEngineManager();

      expect(instance1).toBe(instance2);
    });

    it('createEngineManager 应该创建新实例并替换单例', () => {
      const instance1 = getEngineManager();
      const instance2 = createEngineManager();

      expect(instance2).not.toBe(instance1);
    });
  });
});