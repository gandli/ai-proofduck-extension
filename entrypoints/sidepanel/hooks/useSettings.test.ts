import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettings } from './useSettings';

const storageState: Record<string, unknown> = {};

vi.stubGlobal('browser', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: storageState[key] })),
      set: vi.fn(async (value: Record<string, unknown>) => Object.assign(storageState, value)),
      remove: vi.fn(async (key: string) => {
        delete storageState[key];
      }),
    },
  },
});

describe('useSettings', () => {
  beforeEach(() => {
    Object.keys(storageState).forEach((key) => delete storageState[key]);
  });

  it('loads defaults and persists updates', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
    expect(result.current.ready).toBe(true);
    });

    expect(result.current.settings.targetLanguage).toBe('中文');
    expect(result.current.settings.enginePreference).toBe('auto');
    expect(result.current.settings.localModel).toBe('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    expect(result.current.settings.localAllowWasmFallback).toBe(true);
    expect(result.current.settings.translationFallbackEnabled).toBe(true);
    expect(result.current.settings.onlineApiBase).toBe('');

    await act(async () => {
      await result.current.updateSettings({
        targetLanguage: 'English',
        enginePreference: 'online',
        localAllowWasmFallback: false,
      });
    });

    expect(result.current.settings.targetLanguage).toBe('English');
    expect(result.current.settings.enginePreference).toBe('online');
    expect(result.current.settings.localAllowWasmFallback).toBe(false);
  });
});
