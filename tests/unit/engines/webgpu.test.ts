import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebGPUAdapter, webGPUAdapter } from '@/engines/webgpu';

// Mock navigator.gpu
const mockGPUAdapter = {
  features: new Set(),
  limits: {},
};

const mockGPU = {
  requestAdapter: vi.fn().mockResolvedValue(mockGPUAdapter),
};

// Mock @mlc-ai/web-llm
const mockChatModule = {
  prefill: vi.fn(),
  generate: vi.fn(),
  expressCurrentGeneratedText: vi.fn(),
  resetChat: vi.fn(),
  unload: vi.fn(),
};

vi.mock('@mlc-ai/web-llm', () => ({
  CreateChatModule: vi.fn().mockResolvedValue(mockChatModule),
}));

describe('WebGPUAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup navigator.gpu
    Object.defineProperty(navigator, 'gpu', { value: mockGPU, configurable: true });
  });

  afterEach(() => {
    delete navigator.gpu;
  });

  describe('checkWebGPUSupport', () => {
    it('should detect WebGPU support', async () => {
      const adapter = new WebGPUAdapter();
      const result = await adapter.checkAvailability();

      expect(mockGPU.requestAdapter).toHaveBeenCalled();
    });

    it('should return false when WebGPU is not supported', async () => {
      Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });

      const adapter = new WebGPUAdapter();
      const result = await adapter.checkAvailability();

      expect(result).toBe(false);
    });

    it('should return false when no GPU adapter is available', async () => {
      mockGPU.requestAdapter.mockResolvedValue(null);

      const adapter = new WebGPUAdapter();
      const result = await adapter.checkAvailability();

      expect(result).toBe(false);
    });
  });

  describe('capabilities', () => {
    it('should have correct capabilities', () => {
      const adapter = new WebGPUAdapter();

      expect(adapter.category).toBe('local');
      expect(adapter.priority).toBe(2);
      expect(adapter.capabilities.supportedLanguages).toContain('en');
      expect(adapter.capabilities.supportedLanguages).toContain('zh');
      expect(adapter.capabilities.maxTextLength).toBe(4096);
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models', () => {
      const adapter = new WebGPUAdapter();
      const models = adapter.getAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('description');
    });
  });

  describe('singleton instance', () => {
    it('should export webGPUAdapter singleton', () => {
      expect(webGPUAdapter).toBeInstanceOf(WebGPUAdapter);
      expect(webGPUAdapter.id).toBe('webgpu');
    });
  });
});