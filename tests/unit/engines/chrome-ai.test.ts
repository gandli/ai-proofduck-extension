import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChromeAIAdapter, chromeAIAdapter } from '@/engines/chrome-ai';

// Mock window.ai
const mockLanguageModel = {
  capabilities: vi.fn(),
  create: vi.fn(),
};

const mockSession = {
  prompt: vi.fn(),
  promptStreaming: vi.fn(),
  destroy: vi.fn(),
};

describe('ChromeAIAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup global window.ai
    window.ai = {
      languageModel: mockLanguageModel as unknown as typeof window.ai.languageModel,
    };
  });

  afterEach(() => {
    delete window.ai;
  });

  describe('checkAvailability', () => {
    it('should return true when Chrome AI is readily available', async () => {
      mockLanguageModel.capabilities.mockResolvedValue({ available: 'readily' });

      const adapter = new ChromeAIAdapter();
      const result = await adapter.checkAvailability();

      expect(result).toBe(true);
      expect(mockLanguageModel.capabilities).toHaveBeenCalled();
    });

    it('should return true when Chrome AI is available after download', async () => {
      mockLanguageModel.capabilities.mockResolvedValue({ available: 'after-download' });

      const adapter = new ChromeAIAdapter();
      const result = await adapter.checkAvailability();

      expect(result).toBe(true);
    });

    it('should return false when Chrome AI is not available', async () => {
      mockLanguageModel.capabilities.mockResolvedValue({ available: 'no' });

      const adapter = new ChromeAIAdapter();
      const result = await adapter.checkAvailability();

      expect(result).toBe(false);
    });

    it('should return false when window.ai is not defined', async () => {
      delete window.ai;

      const adapter = new ChromeAIAdapter();
      const result = await adapter.checkAvailability();

      expect(result).toBe(false);
    });

    it('should return false when languageModel is not available', async () => {
      window.ai = undefined as unknown as typeof window.ai;

      const adapter = new ChromeAIAdapter();
      const result = await adapter.checkAvailability();

      expect(result).toBe(false);
    });
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      mockLanguageModel.capabilities.mockResolvedValue({ available: 'readily' });
      mockLanguageModel.create.mockResolvedValue(mockSession);
      mockSession.prompt.mockResolvedValue('你好世界');

      const adapter = new ChromeAIAdapter();
      const result = await adapter.translate('Hello world', 'en', 'zh');

      expect(result.translatedText).toBe('你好世界');
      expect(result.engine).toBe('chrome-ai');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when session creation fails', async () => {
      mockLanguageModel.capabilities.mockResolvedValue({ available: 'readily' });
      mockLanguageModel.create.mockRejectedValue(new Error('Session creation failed'));

      const adapter = new ChromeAIAdapter();

      await expect(adapter.translate('Hello', 'en', 'zh')).rejects.toThrow('Failed to initialize Chrome AI session');
    });
  });

  describe('stream', () => {
    it('should stream translation chunks', async () => {
      const chunks = ['你', '好', '世界'];
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach(chunk => controller.enqueue(chunk));
          controller.close();
        },
      });

      mockLanguageModel.capabilities.mockResolvedValue({ available: 'readily' });
      mockLanguageModel.create.mockResolvedValue(mockSession);
      mockSession.promptStreaming.mockReturnValue(stream);

      const adapter = new ChromeAIAdapter();
      const result = adapter.stream('Hello world', 'en', 'zh');
      const received: string[] = [];

      for await (const chunk of result) {
        if (chunk.delta) {
          received.push(chunk.delta);
        }
      }

      expect(received).toEqual(chunks);
    });
  });

  describe('capabilities', () => {
    it('should have correct capabilities', () => {
      const adapter = new ChromeAIAdapter();

      expect(adapter.category).toBe('local');
      expect(adapter.priority).toBe(1);
      expect(adapter.capabilities.supportedLanguages).toContain('en');
      expect(adapter.capabilities.supportedLanguages).toContain('zh');
      expect(adapter.capabilities.maxTextLength).toBe(8192);
    });
  });

  describe('singleton instance', () => {
    it('should export chromeAIAdapter singleton', () => {
      expect(chromeAIAdapter).toBeInstanceOf(ChromeAIAdapter);
      expect(chromeAIAdapter.id).toBe('chrome-ai');
    });
  });
});