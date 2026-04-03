import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WASMAdapter, wasmAdapter } from '@/engines/wasm';

// Mock @huggingface/transformers
const mockTranslate = vi.fn();

vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue(mockTranslate),
  env: {
    allowLocalModels: false,
    useBrowserCache: true,
  },
}));

describe('WASMAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('should return true when WebAssembly is supported', async () => {
      const adapter = new WASMAdapter();
      const result = await adapter.checkAvailability();

      expect(result).toBe(true);
    });

    it('should return false when WebAssembly is not supported', async () => {
      // Store original WebAssembly
      const originalWasm = global.WebAssembly;
      // @ts-expect-error - intentionally setting to undefined for testing
      global.WebAssembly = undefined;

      try {
        const adapter = new WASMAdapter();
        const result = await adapter.checkAvailability();

        expect(result).toBe(false);
      } finally {
        // Restore WebAssembly
        global.WebAssembly = originalWasm;
      }
    });
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      mockTranslate.mockResolvedValue([
        { translation_text: '你好世界' },
      ]);

      const adapter = new WASMAdapter();
      // Manually set session to skip model loading
      (adapter as unknown as { session: unknown }).session = {
        translate: mockTranslate.mockResolvedValue('你好世界'),
        getTokens: async () => ['你好', '世界'],
        destroy: vi.fn(),
      };

      const result = await adapter.translate('Hello world', 'en', 'zh');

      expect(result.translatedText).toBe('你好世界');
      expect(result.engine).toBe('wasm');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stream', () => {
    it('should yield translation result', async () => {
      mockTranslate.mockResolvedValue([
        { translation_text: '你好世界' },
      ]);

      const adapter = new WASMAdapter();
      // Manually set session
      (adapter as unknown as { session: unknown }).session = {
        translate: mockTranslate.mockResolvedValue('你好世界'),
        getTokens: async () => ['你好', '世界'],
        destroy: vi.fn(),
      };

      const chunks: string[] = [];
      let done = false;

      for await (const chunk of adapter.stream('Hello', 'en', 'zh')) {
        if (chunk.delta) {
          chunks.push(chunk.delta);
        }
        done = chunk.done;
      }

      expect(chunks).toContain('你好世界');
      expect(done).toBe(true);
    });
  });

  describe('capabilities', () => {
    it('should have correct capabilities', () => {
      const adapter = new WASMAdapter();

      expect(adapter.category).toBe('local');
      expect(adapter.priority).toBe(3);
      expect(adapter.capabilities.supportedLanguages).toContain('en');
      expect(adapter.capabilities.supportedLanguages).toContain('zh');
      expect(adapter.capabilities.maxTextLength).toBe(2048);
    });
  });

  describe('getMemoryEstimate', () => {
    it('should return memory estimates', () => {
      const adapter = new WASMAdapter();
      const estimate = adapter.getMemoryEstimate();

      expect(estimate.model).toBe(250);
      expect(estimate.wasm).toBe(50);
    });
  });

  describe('singleton instance', () => {
    it('should export wasmAdapter singleton', () => {
      expect(wasmAdapter).toBeInstanceOf(WASMAdapter);
      expect(wasmAdapter.id).toBe('wasm');
    });
  });
});