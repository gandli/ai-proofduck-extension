import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEngineStore } from '@/stores/engine';

// Mock chrome storage
const mockStorage: Record<string, unknown> = {};

const mockChrome = {
  storage: {
    local: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((obj: Record<string, unknown>) => {
        Object.assign(mockStorage, obj);
        return Promise.resolve();
      }),
      remove: vi.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
    },
  },
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'chrome', {
    value: mockChrome,
    writable: true,
    configurable: true,
  });
  // Reset store state
  useEngineStore.setState({
    selectedEngineId: null,
    enabledEngines: { openai: true, google: true },
    enginePriorities: { openai: 10, google: 5 },
    engineInfos: [],
    sourceLang: 'auto',
    targetLang: 'zh',
    autoTranslate: false,
    bilingualMode: true,
    isTranslating: false,
    lastError: null,
  });
});

describe('Engine Store', () => {
  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useEngineStore.getState();
      expect(state.selectedEngineId).toBeNull();
      expect(state.enabledEngines.openai).toBe(true);
      expect(state.enabledEngines.google).toBe(true);
      expect(state.sourceLang).toBe('auto');
      expect(state.targetLang).toBe('zh');
      expect(state.autoTranslate).toBe(false);
      expect(state.bilingualMode).toBe(true);
      expect(state.isTranslating).toBe(false);
      expect(state.lastError).toBeNull();
    });
  });

  describe('setSelectedEngine', () => {
    it('should set selected engine', () => {
      const { setSelectedEngine } = useEngineStore.getState();
      setSelectedEngine('openai');
      expect(useEngineStore.getState().selectedEngineId).toBe('openai');
    });

    it('should allow null to deselect engine', () => {
      const { setSelectedEngine } = useEngineStore.getState();
      setSelectedEngine('openai');
      setSelectedEngine(null);
      expect(useEngineStore.getState().selectedEngineId).toBeNull();
    });
  });

  describe('setEngineEnabled', () => {
    it('should toggle engine enabled state', () => {
      const { setEngineEnabled } = useEngineStore.getState();
      setEngineEnabled('openai', false);
      expect(useEngineStore.getState().enabledEngines.openai).toBe(false);
    });

    it('should preserve other engine states', () => {
      const { setEngineEnabled } = useEngineStore.getState();
      setEngineEnabled('openai', false);
      expect(useEngineStore.getState().enabledEngines.google).toBe(true);
    });
  });

  describe('setEnginePriority', () => {
    it('should set engine priority', () => {
      const { setEnginePriority } = useEngineStore.getState();
      setEnginePriority('openai', 20);
      expect(useEngineStore.getState().enginePriorities.openai).toBe(20);
    });
  });

  describe('setEngineInfos', () => {
    it('should set engine infos', () => {
      const { setEngineInfos } = useEngineStore.getState();
      const infos: Array<{ id: string; name: string; status: 'idle' | 'translating' | 'ready' | 'error'; error?: string }> = [
        { id: 'openai', name: 'OpenAI', status: 'ready' },
        { id: 'google', name: 'Google', status: 'error', error: 'API error' },
      ];
      setEngineInfos(infos);
      expect(useEngineStore.getState().engineInfos).toEqual(infos);
    });
  });

  describe('updateEngineInfo', () => {
    it('should update specific engine info', () => {
      const { setEngineInfos, updateEngineInfo } = useEngineStore.getState();
      setEngineInfos([
        { id: 'openai', name: 'OpenAI', status: 'idle' },
        { id: 'google', name: 'Google', status: 'idle' },
      ]);
      updateEngineInfo('openai', { status: 'ready' });
      const state = useEngineStore.getState();
      expect(state.engineInfos[0]?.status).toBe('ready');
      expect(state.engineInfos[1]?.status).toBe('idle');
    });
  });

  describe('setSourceLang', () => {
    it('should set source language', () => {
      const { setSourceLang } = useEngineStore.getState();
      setSourceLang('en');
      expect(useEngineStore.getState().sourceLang).toBe('en');
    });
  });

  describe('setTargetLang', () => {
    it('should set target language', () => {
      const { setTargetLang } = useEngineStore.getState();
      setTargetLang('ja');
      expect(useEngineStore.getState().targetLang).toBe('ja');
    });
  });

  describe('setAutoTranslate', () => {
    it('should toggle auto translate', () => {
      const { setAutoTranslate } = useEngineStore.getState();
      setAutoTranslate(true);
      expect(useEngineStore.getState().autoTranslate).toBe(true);
    });
  });

  describe('setBilingualMode', () => {
    it('should toggle bilingual mode', () => {
      const { setBilingualMode } = useEngineStore.getState();
      setBilingualMode(false);
      expect(useEngineStore.getState().bilingualMode).toBe(false);
    });
  });

  describe('setTranslating', () => {
    it('should set translating state', () => {
      const { setTranslating } = useEngineStore.getState();
      setTranslating(true);
      expect(useEngineStore.getState().isTranslating).toBe(true);
    });
  });

  describe('setLastError', () => {
    it('should set error message', () => {
      const { setLastError } = useEngineStore.getState();
      setLastError('Translation failed');
      expect(useEngineStore.getState().lastError).toBe('Translation failed');
    });

    it('should clear error with null', () => {
      const { setLastError } = useEngineStore.getState();
      setLastError('Error');
      setLastError(null);
      expect(useEngineStore.getState().lastError).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to default state', () => {
      const { setSelectedEngine, setAutoTranslate, setLastError, reset } = useEngineStore.getState();
      setSelectedEngine('openai');
      setAutoTranslate(true);
      setLastError('Some error');
      reset();
      const state = useEngineStore.getState();
      expect(state.selectedEngineId).toBeNull();
      expect(state.autoTranslate).toBe(false);
      expect(state.lastError).toBeNull();
    });
  });
});

describe('isSelectedEngineEnabled', () => {
  it('should return true when no engine is selected', async () => {
    const { isSelectedEngineEnabled } = await import('@/stores/engine');
    // Reset state first
    useEngineStore.setState({ selectedEngineId: null });
    expect(isSelectedEngineEnabled()).toBe(true);
  });
});

describe('getEngineStatus', () => {
  it('should return engine status', async () => {
    const { setEngineInfos } = useEngineStore.getState();
    const { getEngineStatus } = await import('@/stores/engine');
    setEngineInfos([
      { id: 'openai', name: 'OpenAI', status: 'ready' as const },
    ]);
    expect(getEngineStatus('openai')).toBe('ready');
  });

  it('should return idle for unknown engine', async () => {
    const { getEngineStatus } = await import('@/stores/engine');
    expect(getEngineStatus('unknown')).toBe('idle');
  });
});