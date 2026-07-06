/**
 * getEngines 单例注册器测试
 *
 * 契约：
 * 1. getEngines() 首次调用时把已知引擎注册进去（M2 Cycle 1 只有 chrome-ai）
 * 2. 后续调用返回同一个 EngineManager 实例
 * 3. list() 至少包含 chrome-ai
 */
import { describe, it, expect } from 'vitest';
import { getEngines } from '@core/engines';

describe('getEngines() 单例', () => {
  it('两次调用返回同一实例', () => {
    const a = getEngines();
    const b = getEngines();
    expect(a).toBe(b);
  });

  it('已注册 chrome-ai 引擎', () => {
    const m = getEngines();
    const ids = m.list().map((e) => e.id);
    expect(ids).toContain('chrome-ai');
  });

  it('已注册 webllm 引擎（M2 Cycle 2）', () => {
    const m = getEngines();
    const ids = m.list().map((e) => e.id);
    expect(ids).toContain('webllm');
  });

  it('已注册 openai-compat 引擎（M2 Cycle 3）', () => {
    const m = getEngines();
    const ids = m.list().map((e) => e.id);
    expect(ids).toContain('openai-compat');
  });

  it('优先级顺序：chrome-ai (100) > webllm (90) > openai-compat (70)', () => {
    const m = getEngines();
    const engines = m.list();
    const chromeAi = engines.find((e) => e.id === 'chrome-ai')!;
    const webllm = engines.find((e) => e.id === 'webllm')!;
    const openai = engines.find((e) => e.id === 'openai-compat')!;
    expect(chromeAi.priority).toBeGreaterThan(webllm.priority);
    expect(webllm.priority).toBeGreaterThan(openai.priority);
  });

  it('chrome-ai 的 name 有值', () => {
    const engine = getEngines().pickById('chrome-ai');
    expect(engine?.name).toBeTruthy();
  });
});
