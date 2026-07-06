/**
 * useTranslate hook 单元测试
 *
 * 契约：
 * 1. 初始状态：output='', status='idle', error=null
 * 2. translate(text) 调用后进入 'loading'，chunk 到达时更新 output（流式），
 *    完成后 status='done'
 * 3. 出错时 status='error', error 有值
 * 4. reset() 回到初始状态
 * 5. 引擎不可用时 status='error'，错误信息友好
 *
 * 依赖注入：hook 接受 engine 参数，测试用 mock 引擎
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranslate } from '@hooks/useTranslate';
import type { Engine } from '@engines/types';

function makeMockEngine(overrides: Partial<Engine> = {}): Engine {
  return {
    id: 'chrome-ai',
    name: 'mock',
    priority: 1,
    isAvailable: async () => true,
    supports: () => true,
    run: async ({ text }) => `[T] ${text}`,
    async *runStreaming({ text }) {
      for (const ch of `[T] ${text}`) yield ch;
    },
    ...overrides,
  };
}

describe('useTranslate', () => {
  it('初始状态', () => {
    const { result } = renderHook(() => useTranslate({ engine: makeMockEngine() }));
    expect(result.current.output).toBe('');
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('翻译流式更新 output，完成后 status=done', async () => {
    const engine = makeMockEngine();
    const { result } = renderHook(() => useTranslate({ engine }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });

    expect(result.current.output).toBe('[T] hi');
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('引擎抛错时 status=error 且 error 有内容', async () => {
    const engine = makeMockEngine({
      async *runStreaming() {
        throw new Error('翻译失败：模型未下载');
      },
    });
    const { result } = renderHook(() => useTranslate({ engine }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/翻译失败/);
  });

  it('reset() 清空状态', async () => {
    const { result } = renderHook(() => useTranslate({ engine: makeMockEngine() }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });
    expect(result.current.output).not.toBe('');

    act(() => result.current.reset());
    expect(result.current.output).toBe('');
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('引擎无 runStreaming 时降级到 run()', async () => {
    const runFn = vi.fn(async () => 'once-only');
    const engine = makeMockEngine({ runStreaming: undefined, run: runFn });
    const { result } = renderHook(() => useTranslate({ engine }));

    await act(async () => {
      await result.current.translate('hi', { source: 'en', target: 'zh' });
    });

    expect(result.current.output).toBe('once-only');
    expect(result.current.status).toBe('done');
    expect(runFn).toHaveBeenCalled();
  });
});
