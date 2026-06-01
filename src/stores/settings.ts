/**
 * Settings Store - API Key and LLM Configuration Management
 * Uses Zustand with persist middleware for chrome.storage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// LLM Provider types
export type LLMProvider = 'openai' | 'claude' | 'deepseek' | 'qwen' | 'gemini';

// API Key configuration per provider
export interface ProviderAPIKey {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
}

// Settings state interface
interface SettingsState {
  // API Keys (encrypted in storage)
  apiKeys: Record<LLMProvider, ProviderAPIKey>;

  // Active LLM provider
  activeLLMProvider: LLMProvider | null;

  // Global settings
  autoTranslate: boolean;
  bilingualMode: boolean;
  defaultTargetLanguage: string;

  // Actions
  setAPIKey: (provider: LLMProvider, config: Partial<ProviderAPIKey>) => void;
  removeAPIKey: (provider: LLMProvider) => void;
  getAPIKey: (provider: LLMProvider) => ProviderAPIKey | undefined;
  setActiveLLMProvider: (provider: LLMProvider | null) => void;
  setAutoTranslate: (enabled: boolean) => void;
  setBilingualMode: (enabled: boolean) => void;
  setDefaultTargetLanguage: (lang: string) => void;
  isConfigured: (provider: LLMProvider) => boolean;
}

const STORAGE_KEY = 'proofduck-secure-storage-key';

function encryptData(data: string): string {
  try {
    const encoded = encodeURIComponent(data);
    return btoa(
      encoded.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ STORAGE_KEY.charCodeAt(i % STORAGE_KEY.length))
      ).join('')
    );
  } catch {
    return data;
  }
}

function decryptData(data: string): string {
  try {
    // If it looks like unencrypted JSON, return as-is for backward compatibility
    if (data.trim().startsWith('{')) return data;

    const decoded = atob(data).split('').map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ STORAGE_KEY.charCodeAt(i % STORAGE_KEY.length))
    ).join('');
    return decodeURIComponent(decoded);
  } catch {
    return data;
  }
}

// Chrome storage adapter for Zustand persist
const chromeStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(name);
    const value = result[name];
    if (typeof value === 'string') {
      return decryptData(value);
    }
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [name]: encryptData(value) });
  },
  removeItem: async (name: string): Promise<void> => {
    await chrome.storage.local.remove(name);
  },
};

// Default API key configuration
const defaultAPIKeys: Record<LLMProvider, ProviderAPIKey> = {
  openai: {
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    enabled: false,
  },
  claude: {
    provider: 'claude',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
    enabled: false,
  },
  deepseek: {
    provider: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    enabled: false,
  },
  qwen: {
    provider: 'qwen',
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
    enabled: false,
  },
  gemini: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    enabled: false,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKeys: { ...defaultAPIKeys },
      activeLLMProvider: null,
      autoTranslate: false,
      bilingualMode: true,
      defaultTargetLanguage: 'zh',

      // Actions
      setAPIKey: (provider, config) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [provider]: {
              ...state.apiKeys[provider],
              ...config,
            },
          },
        }));
      },

      removeAPIKey: (provider) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [provider]: {
              ...defaultAPIKeys[provider],
            },
          },
        }));
      },

      getAPIKey: (provider) => {
        return get().apiKeys[provider];
      },

      setActiveLLMProvider: (provider) => {
        set({ activeLLMProvider: provider });
      },

      setAutoTranslate: (enabled) => {
        set({ autoTranslate: enabled });
      },

      setBilingualMode: (enabled) => {
        set({ bilingualMode: enabled });
      },

      setDefaultTargetLanguage: (lang) => {
        set({ defaultTargetLanguage: lang });
      },

      isConfigured: (provider) => {
        const key = get().apiKeys[provider];
        return !!(key?.apiKey && key?.enabled);
      },
    }),
    {
      name: 'proofduck-settings',
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        activeLLMProvider: state.activeLLMProvider,
        autoTranslate: state.autoTranslate,
        bilingualMode: state.bilingualMode,
        defaultTargetLanguage: state.defaultTargetLanguage,
      }),
    }
  )
);

// Helper function to check if any LLM is configured
export function isAnyLLMConfigured(): boolean {
  const { apiKeys } = useSettingsStore.getState();
  return Object.values(apiKeys).some((key) => key.apiKey && key.enabled);
}

// Helper function to get configured LLM providers
export function getConfiguredProviders(): LLMProvider[] {
  const { apiKeys } = useSettingsStore.getState();
  return Object.entries(apiKeys)
    .filter(([, config]) => config.apiKey && config.enabled)
    .map(([provider]) => provider as LLMProvider);
}