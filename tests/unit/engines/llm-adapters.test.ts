import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIAdapter } from '@/engines/openai';
import { ClaudeAdapter } from '@/engines/claude';
import { DeepSeekAdapter } from '@/engines/deepseek';
import { QwenAdapter } from '@/engines/qwen';
import { GeminiAdapter } from '@/engines/gemini';

// Mock chrome.storage
const mockStorage: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
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
});

// Mock settings store
vi.mock('@/stores/settings', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      getAPIKey: vi.fn((provider: string) => {
        if (provider === 'openai') {
          return {
            provider: 'openai',
            apiKey: 'test-openai-key',
            baseUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
            enabled: true,
          };
        }
        if (provider === 'claude') {
          return {
            provider: 'claude',
            apiKey: 'test-claude-key',
            baseUrl: 'https://api.anthropic.com/v1',
            model: 'claude-sonnet-4-20250514',
            enabled: true,
          };
        }
        if (provider === 'deepseek') {
          return {
            provider: 'deepseek',
            apiKey: 'test-deepseek-key',
            baseUrl: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat',
            enabled: true,
          };
        }
        if (provider === 'qwen') {
          return {
            provider: 'qwen',
            apiKey: 'test-qwen-key',
            baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            model: 'qwen-turbo',
            enabled: true,
          };
        }
        if (provider === 'gemini') {
          return {
            provider: 'gemini',
            apiKey: 'test-gemini-key',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            model: 'gemini-2.0-flash',
            enabled: true,
          };
        }
        return undefined;
      }),
    })),
  },
}));

describe('OpenAI Adapter', () => {
  let adapter: OpenAIAdapter;

  beforeEach(() => {
    adapter = new OpenAIAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct id and name', () => {
    expect(adapter.id).toBe('openai');
    expect(adapter.name).toBe('OpenAI');
    expect(adapter.category).toBe('llm');
  });

  it('should have correct capabilities', () => {
    expect(adapter.capabilities.supportedLanguages).toContain('en');
    expect(adapter.capabilities.supportedLanguages).toContain('zh');
    expect(adapter.capabilities.maxTextLength).toBe(128000);
  });

  it('should check availability correctly', async () => {
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
  });
});

describe('Claude Adapter', () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    adapter = new ClaudeAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct id and name', () => {
    expect(adapter.id).toBe('claude');
    expect(adapter.name).toBe('Claude');
    expect(adapter.category).toBe('llm');
  });

  it('should have correct capabilities', () => {
    expect(adapter.capabilities.supportedLanguages).toContain('en');
    expect(adapter.capabilities.supportedLanguages).toContain('zh');
    expect(adapter.capabilities.maxTextLength).toBe(200000);
  });

  it('should check availability correctly', async () => {
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
  });
});

describe('DeepSeek Adapter', () => {
  let adapter: DeepSeekAdapter;

  beforeEach(() => {
    adapter = new DeepSeekAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct id and name', () => {
    expect(adapter.id).toBe('deepseek');
    expect(adapter.name).toBe('DeepSeek');
    expect(adapter.category).toBe('llm');
  });

  it('should have correct capabilities', () => {
    expect(adapter.capabilities.supportedLanguages).toContain('en');
    expect(adapter.capabilities.supportedLanguages).toContain('zh');
    expect(adapter.capabilities.maxTextLength).toBe(128000);
  });

  it('should check availability correctly', async () => {
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
  });
});

describe('Qwen Adapter', () => {
  let adapter: QwenAdapter;

  beforeEach(() => {
    adapter = new QwenAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct id and name', () => {
    expect(adapter.id).toBe('qwen');
    expect(adapter.name).toBe('Qwen');
    expect(adapter.category).toBe('llm');
  });

  it('should have correct capabilities', () => {
    expect(adapter.capabilities.supportedLanguages).toContain('en');
    expect(adapter.capabilities.supportedLanguages).toContain('zh');
    expect(adapter.capabilities.maxTextLength).toBe(128000);
  });

  it('should check availability correctly', async () => {
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
  });
});

describe('Gemini Adapter', () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    adapter = new GeminiAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct id and name', () => {
    expect(adapter.id).toBe('gemini');
    expect(adapter.name).toBe('Gemini');
    expect(adapter.category).toBe('llm');
  });

  it('should have correct capabilities', () => {
    expect(adapter.capabilities.supportedLanguages).toContain('en');
    expect(adapter.capabilities.supportedLanguages).toContain('zh');
    expect(adapter.capabilities.maxTextLength).toBe(128000);
  });

  it('should check availability correctly', async () => {
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
  });
});

describe('LLM Adapters Priority', () => {
  it('should have correct priority order', () => {
    const openai = new OpenAIAdapter();
    const claude = new ClaudeAdapter();
    const deepseek = new DeepSeekAdapter();
    const qwen = new QwenAdapter();
    const gemini = new GeminiAdapter();

    // Verify priorities are set correctly
    expect(openai.priority).toBe(10);
    expect(claude.priority).toBe(20);
    expect(deepseek.priority).toBe(15);
    expect(qwen.priority).toBe(12);
    expect(gemini.priority).toBe(11);
  });
});