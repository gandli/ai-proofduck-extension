import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings } from '../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../types';

// Mock browser API
const mockBrowser = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

(globalThis as unknown as { browser: typeof mockBrowser }).browser = mockBrowser;

describe('useSettings - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBrowser.storage.local.get.mockResolvedValue({});
    mockBrowser.storage.local.set.mockResolvedValue(undefined);
    mockBrowser.storage.session.get.mockResolvedValue({});
    mockBrowser.storage.session.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Settings Migration', () => {
    it('should migrate targetLanguage to extensionLanguage', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        settings: {
          engine: 'online',
          targetLanguage: 'English',
          // No extensionLanguage
        },
      });

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      expect(result.current.settings.extensionLanguage).toBe('English');
    });

    it('should handle corrupted settings gracefully', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        settings: {
          engine: null,
          extensionLanguage: 12345, // Wrong type
          autoSpeak: 'yes', // Wrong type
        },
      });

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      // Should fall back to defaults for invalid values
      expect(result.current.settings.engine).toBe(DEFAULT_SETTINGS.engine);
      expect(result.current.settings.autoSpeak).toBe(DEFAULT_SETTINGS.autoSpeak);
    });

    it('should handle missing storage data', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('Storage Error Handling', () => {
    it('should handle session storage failure gracefully', async () => {
      mockBrowser.storage.session.set.mockRejectedValue(new Error('Session storage full'));
      
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      // Should not throw, should fallback to local storage
      await act(async () => {
        await result.current.updateSettings({ apiKey: 'test-key' });
      });

      expect(mockBrowser.storage.local.set).toHaveBeenCalled();
    });

    it('should handle tabs.query failure gracefully', async () => {
      mockBrowser.tabs.query.mockRejectedValue(new Error('No active tab'));
      mockBrowser.storage.local.get.mockResolvedValue({});

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        const res = await result.current.loadPersistedSettings();
        expect(res.text).toBe('');
      });
    });

    it('should handle sendMessage failure gracefully', async () => {
      mockBrowser.tabs.query.mockResolvedValue([{ id: 123 }]);
      mockBrowser.tabs.sendMessage.mockRejectedValue(new Error('Content script not loaded'));
      mockBrowser.storage.local.get.mockResolvedValue({});

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        const res = await result.current.loadPersistedSettings();
        expect(res.text).toBe('');
      });
    });
  });

  describe('Config Tracking', () => {
    it('should track ready configs correctly', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      // Simulate setting a local engine and reaching ready state
      await act(async () => {
        result.current.setSettings(prev => ({
          ...prev,
          engine: 'local-gpu',
          localModel: 'test-model',
        }));
      });

      await act(async () => {
        result.current.setStatus('ready');
      });

      await waitFor(() => {
        expect(result.current.settings.readyConfigs).toContain('local-gpu:test-model');
      });
    });

    it('should track failed configs correctly', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      await act(async () => {
        result.current.setSettings(prev => ({
          ...prev,
          engine: 'local-gpu',
          localModel: 'failing-model',
        }));
      });

      await act(async () => {
        result.current.setStatus('error');
      });

      await waitFor(() => {
        expect(result.current.settings.failedConfigs).toContain('local-gpu:failing-model');
      });
    });

    it('should remove from failed when becomes ready', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        result.current.setSettings(prev => ({
          ...prev,
          engine: 'local-gpu',
          localModel: 'model-v1',
          failedConfigs: ['local-gpu:model-v1'],
        }));
      });

      await act(async () => {
        result.current.setStatus('ready');
      });

      await waitFor(() => {
        expect(result.current.settings.failedConfigs).not.toContain('local-gpu:model-v1');
        expect(result.current.settings.readyConfigs).toContain('local-gpu:model-v1');
      });
    });
  });

  describe('Storage Change Listener', () => {
    it('should update status from storage changes', async () => {
      const { result } = renderHook(() => useSettings());
      
      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      // Get the registered listener
      const listener = mockBrowser.storage.onChanged.addListener.mock.calls[0][0];

      // Simulate status change from background
      act(() => {
        listener(
          { engineStatus: { newValue: 'loading' } },
          'local'
        );
      });

      expect(result.current.status).toBe('loading');
    });

    it('should ignore non-local storage changes', async () => {
      const { result } = renderHook(() => useSettings());
      
      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      const listener = mockBrowser.storage.onChanged.addListener.mock.calls[0][0];

      act(() => {
        listener(
          { engineStatus: { newValue: 'ready' } },
          'sync'
        );
      });

      expect(result.current.status).toBe('idle');
    });

    it('should update progress from storage changes', async () => {
      const { result } = renderHook(() => useSettings());
      
      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      const listener = mockBrowser.storage.onChanged.addListener.mock.calls[0][0];

      act(() => {
        listener(
          { lastProgress: { newValue: { progress: 50, text: 'Loading model...' } } },
          'local'
        );
      });

      expect(result.current.progress).toEqual({ progress: 50, text: 'Loading model...' });
    });
  });

  describe('Intent Flags Cleanup', () => {
    it('should clean up intent flags after loading', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        menuIntentMode: 'translate',
        fetchPageIntent: true,
        autoTriggerAt: Date.now(),
      });

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      expect(mockBrowser.storage.local.remove).toHaveBeenCalledWith([
        'menuIntentMode',
        'fetchPageIntent',
        'autoTriggerAt',
      ]);
    });

    it('should return correct intent values', async () => {
      const now = Date.now();
      mockBrowser.storage.local.get.mockResolvedValue({
        menuIntentMode: 'summarize',
        fetchPageIntent: true,
        autoTriggerAt: now,
      });

      const { result } = renderHook(() => useSettings());

      let res: { text: string; mode?: string; fetchPage?: boolean; autoTrigger?: boolean } = { text: '' };
      await act(async () => {
        res = await result.current.loadPersistedSettings();
      });

      expect(res.mode).toBe('summarize');
      expect(res.fetchPage).toBe(true);
      expect(res.autoTrigger).toBe(true);
    });

    it('should detect expired autoTrigger', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        autoTriggerAt: Date.now() - 10000, // 10 seconds ago
      });

      const { result } = renderHook(() => useSettings());

      let res: { autoTrigger?: boolean } = {};
      await act(async () => {
        res = await result.current.loadPersistedSettings();
      });

      expect(res.autoTrigger).toBe(false);
    });
  });

  describe('Engine Status Logic', () => {
    it('should set online engine to ready immediately', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      await act(async () => {
        await result.current.updateSettings({ engine: 'online', apiKey: 'test' });
      });

      expect(result.current.status).toBe('ready');
    });

    it('should handle chrome-ai engine correctly', async () => {
      const mockPostMessage = vi.fn();
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      await act(async () => {
        await result.current.updateSettings({ engine: 'chrome-ai' }, mockPostMessage);
      });

      expect(result.current.status).toBe('ready');
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'load',
        settings: expect.objectContaining({ engine: 'chrome-ai' }),
      });
    });

    it('should skip loading if config is already ready', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        result.current.setSettings(prev => ({
          ...prev,
          engine: 'local-gpu',
          localModel: 'cached-model',
          readyConfigs: ['local-gpu:cached-model'],
        }));
      });

      const mockPostMessage = vi.fn();
      await act(async () => {
        await result.current.updateSettings({ engine: 'local-gpu' }, mockPostMessage);
      });

      expect(result.current.status).toBe('ready');
    });
  });
});
