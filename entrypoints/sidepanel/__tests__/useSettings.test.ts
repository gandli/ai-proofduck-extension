import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../hooks/useSettings';

describe('Feature: useSettings Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.browser = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn()
        },
        session: {
          get: vi.fn(),
          set: vi.fn()
        }
      }
    } as any;
  });

  describe('Scenario: loadPersistedSettings', () => {
    it('Given storage When loading settings Then should retrieve from storage', async () => {
      const mockSettings = { engine: 'online', apiKey: 'test-key' };
      (global.browser.storage.local.get as any).mockResolvedValue(mockSettings);
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.loadPersistedSettings();
      });
      expect(global.browser.storage.local.get).toHaveBeenCalledWith(['engine', 'apiKey', 'language', 'tone', 'detail', 'autoSpeak', 'localModel']);
    });
  });

  describe('Scenario: updateSettings', () => {
    it('Given engine switch to online When updating Then should set engine to ready', async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.updateSettings({ engine: 'online' });
      });
      expect(result.current.settings.engine).toBe('online');
    });

    it('Given engine switch to chrome-ai When updating Then should set engine to idle', async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.updateSettings({ engine: 'chrome-ai' });
      });
      expect(result.current.settings.engine).toBe('chrome-ai');
    });

    it('Given engine switch to local When updating Then should set engine to loading', async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.updateSettings({ engine: 'local-gpu' });
      });
      expect(result.current.settings.engine).toBe('local-gpu');
    });

    it('Given apiKey When updating Then should store in session storage', async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.updateSettings({ apiKey: 'test-key' });
      });
      expect(global.browser.storage.session.set).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });

    it('Given settings When updating Then should persist to local storage', async () => {
      const { result } = renderHook(() => useSettings());
      await act(async () => {
        await result.current.updateSettings({ engine: 'online', language: 'en' });
      });
      expect(global.browser.storage.local.set).toHaveBeenCalledWith({
        engine: 'online',
        language: 'en'
      });
    });
  });
});