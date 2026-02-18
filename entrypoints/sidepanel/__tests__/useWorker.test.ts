import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorker } from '../hooks/useWorker';

describe('Feature: useWorker Hook', () => {
  let mockWorker: any;
  let mockPostMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null
    };
    global.Worker = vi.fn(() => mockWorker);
    global.browser = {
      runtime: {
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        }
      },
      storage: {
        local: {
          onChanged: {
            addListener: vi.fn(),
            removeListener: vi.fn()
          }
        }
      }
    } as any;
    global.chrome = {
      tts: {
        speak: vi.fn()
      }
    } as any;
    mockPostMessage = vi.fn();
    global.postMessage = mockPostMessage;
  });

  describe('Scenario: Worker Message Distribution', () => {
    it('Given progress message When received Then should update progress', () => {
      const { result } = renderHook(() => useWorker());
      act(() => {
        mockWorker.onmessage({ data: { type: 'progress', progress: 50 } });
      });
      expect(result.current.progress).toBe(50);
    });

    it('Given ready message When received Then should set ready state', () => {
      const { result } = renderHook(() => useWorker());
      act(() => {
        mockWorker.onmessage({ data: { type: 'ready' } });
      });
      expect(result.current.isReady).toBe(true);
    });

    it('Given update message When received Then should update content', () => {
      const { result } = renderHook(() => useWorker());
      act(() => {
        mockWorker.onmessage({ data: { type: 'update', content: 'test' } });
      });
      expect(result.current.result).toBe('test');
    });

    it('Given complete message When received Then should set complete state', () => {
      const { result } = renderHook(() => useWorker());
      act(() => {
        mockWorker.onmessage({ data: { type: 'complete' } });
      });
      expect(result.current.isGenerating).toBe(false);
    });

    it('Given error message When received Then should set error state', () => {
      const { result } = renderHook(() => useWorker());
      act(() => {
        mockWorker.onmessage({ data: { type: 'error', error: 'Test error' } });
      });
      expect(result.current.error).toBe('Test error');
    });
  });

  describe('Scenario: QUICK_TRANSLATE Function', () => {
    it('Given runtime message When received Then should trigger translation', () => {
      const { result } = renderHook(() => useWorker());
      const mockListener = (global.browser.runtime.onMessage.addListener as any).mock.calls[0][0];
      mockListener({ type: 'QUICK_TRANSLATE', text: 'test' });
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'generate',
        mode: 'translate',
        prompt: 'test'
      });
    });
  });

  describe('Scenario: Timeout Handling', () => {
    it('Given timeout When generating Then should cancel request', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useWorker());
      act(() => {
        result.current.generate('test', 'translate');
      });
      act(() => {
        vi.advanceTimersByTime(15000);
      });
      expect(result.current.error).toBe('Request timeout');
      vi.useRealTimers();
    });
  });

  describe('Scenario: Storage Change Listener', () => {
    it('Given selectedText change When detected Then should update state', () => {
      const { result } = renderHook(() => useWorker());
      const mockListener = (global.browser.storage.local.onChanged.addListener as any).mock.calls[0][0];
      mockListener({ selectedText: { newValue: 'test text' } });
      expect(result.current.inputText).toBe('test text');
    });
  });

  describe('Scenario: autoSpeak TTS Trigger', () => {
    it('Given autoSpeak enabled When result complete Then should trigger TTS', () => {
      const { result } = renderHook(() => useWorker());
      act(() => {
        result.current.updateSettings({ autoSpeak: true });
        mockWorker.onmessage({ data: { type: 'complete', result: 'test result' } });
      });
      expect(global.chrome.tts.speak).toHaveBeenCalledWith('test result', expect.any(Object));
    });
  });
});