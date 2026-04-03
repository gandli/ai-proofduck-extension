import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore, isAnyLLMConfigured, getConfiguredProviders, type LLMProvider } from '@/stores/settings';

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
  useSettingsStore.setState({
    apiKeys: {
      openai: { provider: 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', enabled: false },
      claude: { provider: 'claude', apiKey: '', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514', enabled: false },
      deepseek: { provider: 'deepseek', apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', enabled: false },
      qwen: { provider: 'qwen', apiKey: '', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo', enabled: false },
      gemini: { provider: 'gemini', apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash', enabled: false },
    },
    activeLLMProvider: null,
    autoTranslate: false,
    bilingualMode: true,
    defaultTargetLanguage: 'zh',
  });
});

describe('Settings Store', () => {
  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useSettingsStore.getState();
      expect(state.apiKeys.openai.apiKey).toBe('');
      expect(state.apiKeys.openai.enabled).toBe(false);
      expect(state.activeLLMProvider).toBeNull();
      expect(state.autoTranslate).toBe(false);
      expect(state.bilingualMode).toBe(true);
      expect(state.defaultTargetLanguage).toBe('zh');
    });
  });

  describe('setAPIKey', () => {
    it('should set API key for a provider', () => {
      const { setAPIKey } = useSettingsStore.getState();
      setAPIKey('openai', { apiKey: 'test-key-123' });
      const state = useSettingsStore.getState();
      expect(state.apiKeys.openai.apiKey).toBe('test-key-123');
    });

    it('should preserve existing provider config', () => {
      const { setAPIKey } = useSettingsStore.getState();
      setAPIKey('openai', { apiKey: 'test-key' });
      const state = useSettingsStore.getState();
      expect(state.apiKeys.openai.baseUrl).toBe('https://api.openai.com/v1');
      expect(state.apiKeys.openai.model).toBe('gpt-4o-mini');
    });

    it('should allow setting multiple properties', () => {
      const { setAPIKey } = useSettingsStore.getState();
      setAPIKey('openai', {
        apiKey: 'test-key',
        baseUrl: 'https://custom.openai.com/v1',
        model: 'gpt-4',
        enabled: true,
      });
      const state = useSettingsStore.getState();
      expect(state.apiKeys.openai.apiKey).toBe('test-key');
      expect(state.apiKeys.openai.baseUrl).toBe('https://custom.openai.com/v1');
      expect(state.apiKeys.openai.model).toBe('gpt-4');
      expect(state.apiKeys.openai.enabled).toBe(true);
    });
  });

  describe('removeAPIKey', () => {
    it('should reset API key to default', () => {
      const { setAPIKey, removeAPIKey } = useSettingsStore.getState();
      setAPIKey('openai', { apiKey: 'test-key', enabled: true });
      removeAPIKey('openai');
      const state = useSettingsStore.getState();
      expect(state.apiKeys.openai.apiKey).toBe('');
      expect(state.apiKeys.openai.enabled).toBe(false);
    });
  });

  describe('getAPIKey', () => {
    it('should return API key config', () => {
      const { setAPIKey, getAPIKey } = useSettingsStore.getState();
      setAPIKey('claude', { apiKey: 'claude-key' });
      const config = getAPIKey('claude');
      expect(config?.apiKey).toBe('claude-key');
    });

    it('should return undefined for unknown provider', () => {
      const { getAPIKey } = useSettingsStore.getState();
      expect(getAPIKey('unknown' as LLMProvider)).toBeUndefined();
    });
  });

  describe('setActiveLLMProvider', () => {
    it('should set active LLM provider', () => {
      const { setActiveLLMProvider } = useSettingsStore.getState();
      setActiveLLMProvider('openai');
      expect(useSettingsStore.getState().activeLLMProvider).toBe('openai');
    });

    it('should allow setting null', () => {
      const { setActiveLLMProvider } = useSettingsStore.getState();
      setActiveLLMProvider('openai');
      setActiveLLMProvider(null);
      expect(useSettingsStore.getState().activeLLMProvider).toBeNull();
    });
  });

  describe('setAutoTranslate', () => {
    it('should toggle auto translate', () => {
      const { setAutoTranslate } = useSettingsStore.getState();
      setAutoTranslate(true);
      expect(useSettingsStore.getState().autoTranslate).toBe(true);
    });
  });

  describe('setBilingualMode', () => {
    it('should toggle bilingual mode', () => {
      const { setBilingualMode } = useSettingsStore.getState();
      setBilingualMode(false);
      expect(useSettingsStore.getState().bilingualMode).toBe(false);
    });
  });

  describe('setDefaultTargetLanguage', () => {
    it('should set default target language', () => {
      const { setDefaultTargetLanguage } = useSettingsStore.getState();
      setDefaultTargetLanguage('en');
      expect(useSettingsStore.getState().defaultTargetLanguage).toBe('en');
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is set and enabled', () => {
      const { setAPIKey, isConfigured } = useSettingsStore.getState();
      setAPIKey('openai', { apiKey: 'test-key', enabled: true });
      expect(isConfigured('openai')).toBe(true);
    });

    it('should return false when API key is not set', () => {
      const { isConfigured } = useSettingsStore.getState();
      expect(isConfigured('openai')).toBe(false);
    });

    it('should return false when API key is set but not enabled', () => {
      const { setAPIKey, isConfigured } = useSettingsStore.getState();
      setAPIKey('openai', { apiKey: 'test-key', enabled: false });
      expect(isConfigured('openai')).toBe(false);
    });
  });
});

describe('isAnyLLMConfigured', () => {
  it('should return false when no providers are configured', () => {
    expect(isAnyLLMConfigured()).toBe(false);
  });

  it('should return true when at least one provider is configured', () => {
    const { setAPIKey } = useSettingsStore.getState();
    setAPIKey('openai', { apiKey: 'test-key', enabled: true });
    expect(isAnyLLMConfigured()).toBe(true);
  });
});

describe('getConfiguredProviders', () => {
  it('should return empty array when no providers configured', () => {
    expect(getConfiguredProviders()).toEqual([]);
  });

  it('should return list of configured providers', () => {
    const { setAPIKey } = useSettingsStore.getState();
    setAPIKey('openai', { apiKey: 'key1', enabled: true });
    setAPIKey('claude', { apiKey: 'key2', enabled: true });
    setAPIKey('deepseek', { apiKey: '', enabled: false });
    const providers = getConfiguredProviders();
    expect(providers).toContain('openai');
    expect(providers).toContain('claude');
    expect(providers).not.toContain('deepseek');
  });
});