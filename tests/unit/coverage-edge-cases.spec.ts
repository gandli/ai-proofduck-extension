/**
 * coverage 边角补齐
 *
 * 目标：所有 src/ 下文件 statements ≥ 90%
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { defineStorage } from '@core/storage';

// ─── storage.ts L66: onChanged callback with undefined newValue ───
describe('storage — onChanged with undefined newValue', () => {
  beforeEach(() => {
    // fakeBrowser 已提供 chrome.storage.onChanged mock
  });

  it('change.newValue undefined → uses defaultValue', () => {
    const listeners: Array<
      (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
    > = [];
    (globalThis as unknown as { chrome: unknown }).chrome = {
      ...(globalThis as unknown as { chrome: unknown }).chrome as object,
      storage: {
        ...((globalThis as unknown as { chrome: unknown }).chrome as any)?.storage,
        onChanged: {
          addListener: (fn: any) => listeners.push(fn),
          removeListener: () => {},
        },
      },
    };

    const store = defineStorage<string>('test.key', 'fallback-val', { area: 'sync' });
    const cb = vi.fn();
    const unsub = store.watch(cb);

    // 模拟 onChanged 触发
    listeners.forEach((fn) => fn(
      { 'test.key': { newValue: undefined, oldValue: 'old' } } as Record<string, chrome.storage.StorageChange>,
      'sync',
    ));

    expect(cb).toHaveBeenCalledWith('fallback-val', 'old');
    unsub();
  });
});

// ─── free-translate.ts L54: non-array chunk ───
describe('free-translate — parse edge cases', () => {
  it('chunk[0] not array → empty string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify([[null]])),
    ));
    const { createFreeTranslateEngine } = await import('@engines/free-translate');
    const result = await createFreeTranslateEngine().run({
      mode: 'translate',
      text: 'hello',
      targetLang: 'zh',
    });
    expect(result).toBe('');
    vi.unstubAllGlobals();
  });
});

// ─── useSelection L44: sel null / rangeCount 0 ───
describe('useSelection — edge cases', () => {
  it('selection rangeCount=0 → empty result', async () => {
    // 需要 render 一个组件使用 hook
    const { renderHook } = await import('@testing-library/react');
    const { useSelection } = await import('@hooks/useSelection');

    // 模拟空选择
    const sel = window.getSelection();
    sel?.removeAllRanges();

    // vi.spyOn 返回空
    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => '',
      rangeCount: 0,
      getRangeAt: vi.fn(),
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
    } as unknown as Selection);

    const { result } = renderHook(() => useSelection({ minLength: 1 }));
    await vi.waitFor(() => {
      expect(result.current.selectedText).toBe('');
      expect(result.current.rect).toBeNull();
    });

    vi.restoreAllMocks();
  });
});

// ─── useTranslate ───
describe('useTranslate — edge paths', () => {
  it('engine.runStreaming path — timeout error', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const { useTranslate } = await import('@hooks/useTranslate');
    const { renderHook } = await import('@testing-library/react');

    // 模拟一个带 runStreaming 的引擎
    const mockEngine = {
      id: 'test',
      name: 'Test',
      priority: 50,
      isAvailable: async () => true,
      supports: () => true,
      runStreaming: vi.fn().mockImplementation(async function* () {
        throw new DOMException('The operation timed out', 'TimeoutError');
      }),
    };

    const { result } = renderHook(() =>
      useTranslate({ engine: mockEngine as any }),
    );

    // 触发翻译 — 会走到 timeout error 分支
    await act(async () => {
      await result.current.translate('hello', {
        source: 'auto',
        target: 'zh',
      });
    });

    // should show timeout message
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('超时');

    vi.unstubAllGlobals();
  });
});
