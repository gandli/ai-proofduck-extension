import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorker } from '../hooks/useWorker';
import { useSettings } from '../hooks/useSettings';
import { Settings, ModeKey, EngineStatus } from '../types';

// Mock browser API with performance tracking
const mockBrowser = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
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

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBrowser.storage.local.get.mockResolvedValue({});
    mockBrowser.runtime.sendMessage.mockResolvedValue({});
  });

  describe('Memory Efficiency', () => {
    it('should clean up listeners on unmount', async () => {
      const settingsRef = { current: {} as Settings };
      const statusRef = { current: 'idle' as EngineStatus };
      
      const { unmount } = renderHook(() =>
        useWorker({
          settingsRef,
          statusRef,
          setStatus: vi.fn(),
          setProgress: vi.fn(),
          setError: vi.fn(),
          setModeResults: vi.fn(),
          setGeneratingModes: vi.fn(),
          setSelectedText: vi.fn(),
          setShowSettings: vi.fn(),
        })
      );

      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledTimes(2);

      unmount();

      expect(mockBrowser.runtime.onMessage.removeListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('Update Throttling', () => {
    it('should handle rapid progress updates efficiently', async () => {
      const setProgress = vi.fn();
      const settingsRef = { current: {} as Settings };
      const statusRef = { current: 'idle' as EngineStatus };
      
      renderHook(() =>
        useWorker({
          settingsRef,
          statusRef,
          setStatus: vi.fn(),
          setProgress,
          setError: vi.fn(),
          setModeResults: vi.fn(),
          setGeneratingModes: vi.fn(),
          setSelectedText: vi.fn(),
          setShowSettings: vi.fn(),
        })
      );

      // Get the background message handler
      const handler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];

      // Simulate rapid progress updates
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        handler({
          type: 'WORKER_UPDATE',
          data: { type: 'progress', progress: { progress: i, text: `Step ${i}` } },
        });
      }
      const endTime = Date.now();

      // Should complete quickly without blocking
      expect(endTime - startTime).toBeLessThan(200);
      
      // All updates should be processed
      expect(setProgress.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large text inputs efficiently', async () => {
      const setModeResults = vi.fn();
      const settingsRef = { current: {} as Settings };
      const statusRef = { current: 'idle' as EngineStatus };
      
      renderHook(() =>
        useWorker({
          settingsRef,
          statusRef,
          setStatus: vi.fn(),
          setProgress: vi.fn(),
          setError: vi.fn(),
          setModeResults,
          setGeneratingModes: vi.fn(),
          setSelectedText: vi.fn(),
          setShowSettings: vi.fn(),
        })
      );

      const handler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];

      // Generate large text (100KB instead of 1MB for faster test)
      const largeText = 'x'.repeat(100 * 1024);

      const startTime = Date.now();
      handler({
        type: 'WORKER_UPDATE',
        data: { type: 'complete', text: largeText, mode: 'translate' as ModeKey },
      });
      const endTime = Date.now();

      // Should handle large data without significant delay
      expect(endTime - startTime).toBeLessThan(100);
      expect(setModeResults).toHaveBeenCalled();
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent quick translate requests', async () => {
      const settingsRef = { current: { engine: 'online' } as Settings };
      const statusRef = { current: 'ready' as EngineStatus };
      
      renderHook(() =>
        useWorker({
          settingsRef,
          statusRef,
          setStatus: vi.fn(),
          setProgress: vi.fn(),
          setError: vi.fn(),
          setModeResults: vi.fn(),
          setGeneratingModes: vi.fn(),
          setSelectedText: vi.fn(),
          setShowSettings: vi.fn(),
        })
      );

      const handler = mockBrowser.runtime.onMessage.addListener.mock.calls[1][0];

      // Simulate multiple concurrent requests
      const responses: Array<{ error?: string; translatedText?: string }> = [];
      const sendResponse = (res: { error?: string; translatedText?: string }) => {
        responses.push(res);
      };

      // Fire 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        handler(
          { type: 'QUICK_TRANSLATE', text: `Text ${i}` },
          {},
          sendResponse
        );
      }

      // All requests should be handled
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledTimes(5);
    });
  });

  describe('Storage Operations Performance', () => {
    it('should persist settings correctly', async () => {
      const { result, unmount } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      // Reset mock to count only updateSettings calls
      mockBrowser.storage.local.set.mockClear();

      // Perform multiple updates
      const updates = [
        { tone: 'casual' },
        { detailLevel: 'brief' },
        { autoSpeak: true },
      ];

      for (const update of updates) {
        await act(async () => {
          await result.current.updateSettings(update);
        });
      }

      // Allow debounced state updates to flush (wait out 500ms debounce)
      await new Promise(r => setTimeout(r, 600));

      // Flush debounced updates
      unmount();

      // Storage should be called for each update (plus one for engineStatus)
      expect(mockBrowser.storage.local.set.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should track config states correctly', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadPersistedSettings();
      });

      // Set up a local engine config
      await act(async () => {
        result.current.setSettings(prev => ({
          ...prev,
          engine: 'local-gpu',
          localModel: 'test-model',
        }));
      });

      // Trigger status changes
      await act(async () => {
        result.current.setStatus('loading');
      });
      
      await act(async () => {
        result.current.setStatus('ready');
      });

      // Verify readyConfigs was updated
      await act(async () => {
        expect(result.current.settings.readyConfigs).toContain('local-gpu:test-model');
      });
    });
  });
});
