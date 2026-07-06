/**
 * engine-manager 单元测试
 *
 * 设计动机：
 * - 未来 M2 会有 5 个 AI 引擎，需要一个 registry + 仲裁器
 * - 每个引擎独立实现 Engine 接口，manager 负责按优先级挑一个可用的
 *
 * M1 契约（骨架，不含真正引擎）：
 * 1. register(engine) 注册一个引擎
 * 2. list() 返回所有已注册的引擎
 * 3. pickBest() 按优先级挑一个 available 的引擎，优先级高的优先
 * 4. 无可用引擎时 pickBest() 返回 null
 * 5. 显式指定 id 时用 pickById() 返回对应引擎
 */
import { describe, it, expect } from 'vitest';
import { createEngineManager } from '@core/engine-manager';
import type { Engine } from '@engines/types';

// 测试专用的 stub 引擎
const stubEngine = (id: string, priority: number, available: boolean): Engine => ({
  id: id as Engine['id'],
  name: `Stub ${id}`,
  priority,
  isAvailable: async () => available,
  supports: () => true,
  run: async () => 'stub-output',
});

describe('engine-manager', () => {
  it('register 后 list 返回该引擎', () => {
    const m = createEngineManager();
    const eng = stubEngine('chrome-ai', 100, true);
    m.register(eng);
    expect(m.list()).toEqual([eng]);
  });

  it('pickBest 挑优先级最高的可用引擎', async () => {
    const m = createEngineManager();
    m.register(stubEngine('chrome-ai', 100, true));
    m.register(stubEngine('webllm', 80, true));
    m.register(stubEngine('free-translate', 10, true));

    const picked = await m.pickBest();
    expect(picked?.id).toBe('chrome-ai');
  });

  it('pickBest 跳过不可用引擎', async () => {
    const m = createEngineManager();
    m.register(stubEngine('chrome-ai', 100, false)); // 高优但不可用
    m.register(stubEngine('webllm', 80, true));

    const picked = await m.pickBest();
    expect(picked?.id).toBe('webllm');
  });

  it('无可用引擎时 pickBest 返回 null', async () => {
    const m = createEngineManager();
    m.register(stubEngine('chrome-ai', 100, false));
    m.register(stubEngine('webllm', 80, false));

    expect(await m.pickBest()).toBeNull();
  });

  it('pickById 返回对应引擎（存在时）', () => {
    const m = createEngineManager();
    const eng = stubEngine('webllm', 80, true);
    m.register(eng);
    expect(m.pickById('webllm')).toBe(eng);
  });

  it('pickById 引擎不存在时返回 null', () => {
    const m = createEngineManager();
    expect(m.pickById('webllm')).toBeNull();
  });

  it('相同 id 二次 register 应替换旧引擎（避免重复）', () => {
    const m = createEngineManager();
    const e1 = stubEngine('webllm', 50, true);
    const e2 = stubEngine('webllm', 90, true);
    m.register(e1);
    m.register(e2);
    expect(m.list()).toHaveLength(1);
    expect(m.list()[0]).toBe(e2);
  });
});
