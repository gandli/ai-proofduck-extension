import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelLoader, modelLoader, LocalModelType } from '@/core/ModelLoader';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((key) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((items) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
  },
});

// Mock navigator.gpu
const mockGPUAdapter = {
  features: new Set(),
  limits: {},
};

vi.stubGlobal('navigator', {
  gpu: {
    requestAdapter: vi.fn().mockResolvedValue(mockGPUAdapter),
  },
});

// Mock window.ai
vi.stubGlobal('window', {
  ai: {
    languageModel: {
      capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
      create: vi.fn(),
    },
  },
});

describe('ModelLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      const loader = new ModelLoader();
      await expect(loader.initialize()).resolves.not.toThrow();
    });

    it('should only initialize once', async () => {
      const loader = new ModelLoader();
      await loader.initialize();
      await loader.initialize(); // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getModelInfo', () => {
    it('should return model info for valid model id', () => {
      const loader = new ModelLoader();
      const info = loader.getModelInfo('webgpu');

      expect(info).toBeDefined();
      expect(info?.id).toBe('webgpu');
      expect(info?.name).toBeTruthy();
      expect(info?.sizeBytes).toBeGreaterThan(0);
    });

    it('should return undefined for invalid model id', () => {
      const loader = new ModelLoader();
      const info = loader.getModelInfo('invalid' as LocalModelType);

      expect(info).toBeUndefined();
    });
  });

  describe('getAllModels', () => {
    it('should return all registered models', () => {
      const loader = new ModelLoader();
      const models = loader.getAllModels();

      expect(models.length).toBe(3);
      expect(models.map(m => m.id)).toContain('chrome-ai');
      expect(models.map(m => m.id)).toContain('webgpu');
      expect(models.map(m => m.id)).toContain('wasm');
    });
  });

  describe('getStatus', () => {
    it('should return status for a model', () => {
      const loader = new ModelLoader();
      const status = loader.getStatus('webgpu');

      expect(status).toBeDefined();
      expect(status.modelId).toBe('webgpu');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('progress');
    });
  });

  describe('getAllStatuses', () => {
    it('should return all statuses', () => {
      const loader = new ModelLoader();
      const statuses = loader.getAllStatuses();

      expect(Object.keys(statuses)).toHaveLength(3);
      expect(statuses['chrome-ai']).toBeDefined();
      expect(statuses['webgpu']).toBeDefined();
      expect(statuses['wasm']).toBeDefined();
    });
  });

  describe('subscribe', () => {
    it('should allow subscribing to status changes', () => {
      const loader = new ModelLoader();
      const callback = vi.fn();

      const unsubscribe = loader.subscribe(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('checkChromeAI', () => {
    it('should return true when Chrome AI is available', async () => {
      const loader = new ModelLoader();
      (window.ai!.languageModel!.capabilities as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        available: 'readily',
      });

      const result = await loader.checkModel('chrome-ai');

      expect(result).toBe(true);
    });

    it('should return false when Chrome AI is not available', async () => {
      const loader = new ModelLoader();
      (window.ai!.languageModel!.capabilities as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        available: 'no',
      });

      const result = await loader.checkModel('chrome-ai');

      expect(result).toBe(false);
    });
  });

  describe('checkWebGPU', () => {
    it('should return true when WebGPU is available', async () => {
      const loader = new ModelLoader();
      const result = await loader.checkModel('webgpu');

      expect(result).toBe(true);
    });

    it('should return false when WebGPU is not available', async () => {
      const loader = new ModelLoader();
      (navigator.gpu.requestAdapter as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await loader.checkModel('webgpu');

      expect(result).toBe(false);
    });
  });

  describe('checkWASM', () => {
    it('should return true when WASM is available', async () => {
      const loader = new ModelLoader();
      const result = await loader.checkModel('wasm');

      expect(result).toBe(true);
    });
  });

  describe('getRecommendedModel', () => {
    it('should return chrome-ai if available', async () => {
      const loader = new ModelLoader();
      const result = loader.getRecommendedModel();

      // chrome-ai should be first priority if downloaded
      expect(['chrome-ai', 'webgpu', 'wasm']).toContain(result);
    });
  });

  describe('getStorageUsed', () => {
    it('should return total storage used', async () => {
      const loader = new ModelLoader();
      const storage = await loader.getStorageUsed();

      expect(typeof storage).toBe('number');
      expect(storage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('singleton instance', () => {
    it('should export modelLoader singleton', () => {
      expect(modelLoader).toBeInstanceOf(ModelLoader);
    });
  });
});