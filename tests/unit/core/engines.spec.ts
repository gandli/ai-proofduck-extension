/**
 * engines 单例装配 + 重置钩子
 */
import { describe, it, expect } from 'vitest';
import { getEngines, _resetEnginesForTest } from '@core/engines';

describe('engines 单例', () => {
  it('getEngines() 应返回同一实例', () => {
    const a = getEngines();
    const b = getEngines();
    expect(a).toBe(b);
  });

  it('_resetEnginesForTest() 后再取到新实例', () => {
    const before = getEngines();
    _resetEnginesForTest();
    const after = getEngines();
    expect(after).not.toBe(before);
  });

  it('装配后应包含预期引擎（按优先级降序）', () => {
    _resetEnginesForTest();
    const mgr = getEngines();
    const list = mgr.list().map((e) => e.id);
    expect(list).toContain('chrome-ai');
    expect(list).toContain('webllm');
    expect(list).toContain('openai-compat');
    expect(list).toContain('free-translate');
  });
});
