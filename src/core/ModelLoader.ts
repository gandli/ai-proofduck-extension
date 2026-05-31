/**
 * ModelLoader - Background Model Download Management
 * Handles downloading and caching of local AI models for offline use
 */

// Model types
export type LocalModelType = 'chrome-ai' | 'webgpu' | 'wasm';

// Model information
export interface ModelInfo {
  id: LocalModelType;
  name: string;
  description: string;
  sizeBytes: number;
  required: boolean;
}

// Model download status
export interface DownloadStatus {
  modelId: LocalModelType;
  status: 'idle' | 'checking' | 'downloading' | 'downloaded' | 'error';
  progress: number; // 0-100
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string;
  lastChecked?: Date;
}

// Model registry
const MODEL_REGISTRY: Record<LocalModelType, ModelInfo> = {
  'chrome-ai': {
    id: 'chrome-ai',
    name: 'Chrome AI (Gemini Nano)',
    description: 'Built-in Chrome AI, no download needed',
    sizeBytes: 0,
    required: false,
  },
  'webgpu': {
    id: 'webgpu',
    name: 'WebGPU Models (Qwen/Llama)',
    description: 'High-quality local models via web-llm',
    sizeBytes: 500 * 1024 * 1024, // ~500MB estimated
    required: false,
  },
  'wasm': {
    id: 'wasm',
    name: 'WASM (NLLB-200)',
    description: 'Lightweight CPU translation model',
    sizeBytes: 300 * 1024 * 1024, // ~300MB estimated
    required: false,
  },
};

// Storage keys
const STORAGE_KEYS = {
  DOWNLOAD_STATUS: 'proofduck-model-downloads',
  LAST_CHECK: 'proofduck-model-last-check',
} as const;

// ModelLoader state
interface ModelLoaderState {
  // Download statuses per model
  statuses: Record<LocalModelType, DownloadStatus>;

  // Currently downloading model
  activeDownload: LocalModelType | null;

  // Listeners for status changes
  listeners: Set<(statuses: Record<LocalModelType, DownloadStatus>) => void>;
}

// ModelLoader class
export class ModelLoader {
  private state: ModelLoaderState;
  private initialized = false;

  constructor() {
    this.state = {
      statuses: this.getDefaultStatuses(),
      activeDownload: null,
      listeners: new Set(),
    };
  }

  /**
   * Initialize the model loader
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load saved statuses from storage
    await this.loadStatuses();

    // Check availability of each model
    await this.checkAllModels();

    this.initialized = true;
  }

  /**
   * Get default statuses for all models
   */
  private getDefaultStatuses(): Record<LocalModelType, DownloadStatus> {
    return {
      'chrome-ai': {
        modelId: 'chrome-ai',
        status: 'idle',
        progress: 0,
      },
      'webgpu': {
        modelId: 'webgpu',
        status: 'idle',
        progress: 0,
      },
      'wasm': {
        modelId: 'wasm',
        status: 'idle',
        progress: 0,
      },
    };
  }

  /**
   * Load saved download statuses from chrome.storage
   */
  private async loadStatuses(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.DOWNLOAD_STATUS);
      if (result[STORAGE_KEYS.DOWNLOAD_STATUS]) {
        const saved = result[STORAGE_KEYS.DOWNLOAD_STATUS] as Record<LocalModelType, DownloadStatus>;
        // Merge with defaults
        for (const modelId of Object.keys(this.state.statuses) as LocalModelType[]) {
          if (saved[modelId]) {
            this.state.statuses[modelId] = saved[modelId];
          }
        }
      }
    } catch (error) {
      console.error('[ModelLoader] Failed to load statuses:', error);
    }
  }

  /**
   * Save download statuses to chrome.storage
   */
  private async saveStatuses(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.DOWNLOAD_STATUS]: this.state.statuses,
      });
    } catch (error) {
      console.error('[ModelLoader] Failed to save statuses:', error);
    }
  }

  /**
   * Get model information
   */
  getModelInfo(modelId: LocalModelType): ModelInfo | undefined {
    return MODEL_REGISTRY[modelId];
  }

  /**
   * Get all available models
   */
  getAllModels(): ModelInfo[] {
    return Object.values(MODEL_REGISTRY);
  }

  /**
   * Get current download status for a model
   */
  getStatus(modelId: LocalModelType): DownloadStatus {
    return this.state.statuses[modelId] || {
      modelId,
      status: 'idle',
      progress: 0,
    };
  }

  /**
   * Get all download statuses
   */
  getAllStatuses(): Record<LocalModelType, DownloadStatus> {
    return { ...this.state.statuses };
  }

  /**
   * Subscribe to status changes
   */
  subscribe(callback: (statuses: Record<LocalModelType, DownloadStatus>) => void): () => void {
    this.state.listeners.add(callback);
    return () => {
      this.state.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    const statuses = this.getAllStatuses();
    for (const listener of this.state.listeners) {
      try {
        listener(statuses);
      } catch (error) {
        console.error('[ModelLoader] Listener error:', error);
      }
    }
  }

  /**
   * Update status for a model
   */
  private async updateStatus(modelId: LocalModelType, update: Partial<DownloadStatus>): Promise<void> {
    this.state.statuses[modelId] = {
      ...this.state.statuses[modelId],
      ...update,
    };
    await this.saveStatuses();
    this.notifyListeners();
  }

  /**
   * Check availability of all models
   */
  async checkAllModels(): Promise<void> {
    // ⚡ Bolt: Parallelize model availability checks to reduce initialization time
    const modelIds = Object.keys(MODEL_REGISTRY) as LocalModelType[];
    await Promise.all(modelIds.map(modelId => this.checkModel(modelId)));
  }

  /**
   * Check if a specific model is available
   */
  async checkModel(modelId: LocalModelType): Promise<boolean> {
    await this.updateStatus(modelId, { status: 'checking' });

    try {
      let available = false;

      switch (modelId) {
        case 'chrome-ai':
          available = await this.checkChromeAI();
          break;
        case 'webgpu':
          available = await this.checkWebGPU();
          break;
        case 'wasm':
          available = await this.checkWASM();
          break;
      }

      await this.updateStatus(modelId, {
        status: available ? 'downloaded' : 'idle',
        progress: available ? 100 : 0,
        lastChecked: new Date(),
      });

      return available;
    } catch (error) {
      await this.updateStatus(modelId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Check failed',
        lastChecked: new Date(),
      });
      return false;
    }
  }

  /**
   * Check Chrome AI availability
   */
  private async checkChromeAI(): Promise<boolean> {
    try {
      // Check if window.ai exists with languageModel capability
      if (!window.ai?.languageModel) {
        return false;
      }

      const capabilities = await window.ai.languageModel.capabilities();
      return capabilities.available === 'readily' || capabilities.available === 'after-download';
    } catch {
      return false;
    }
  }

  /**
   * Check WebGPU availability
   */
  private async checkWebGPU(): Promise<boolean> {
    try {
      if (!('gpu' in navigator)) {
        return false;
      }

      const adapter = await navigator.gpu?.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check WASM availability
   */
  private async checkWASM(): Promise<boolean> {
    try {
      return typeof WebAssembly !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Download a model
   */
  async downloadModel(modelId: LocalModelType): Promise<void> {
    if (this.state.activeDownload) {
      throw new Error(`Already downloading ${this.state.activeDownload}`);
    }

    if (this.state.statuses[modelId].status === 'downloaded') {
      return; // Already downloaded
    }

    this.state.activeDownload = modelId;

    try {
      await this.updateStatus(modelId, { status: 'downloading', progress: 0 });

      switch (modelId) {
        case 'chrome-ai':
          // Chrome AI doesn't need download - just check availability
          await this.checkChromeAI();
          break;

        case 'webgpu':
          await this.downloadWebGPUModel();
          break;

        case 'wasm':
          await this.downloadWASMModel();
          break;
      }

      await this.updateStatus(modelId, {
        status: 'downloaded',
        progress: 100,
      });
    } catch (error) {
      await this.updateStatus(modelId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed',
      });
      throw error;
    } finally {
      this.state.activeDownload = null;
    }
  }

  /**
   * Download WebGPU model (web-llm)
   */
  private async downloadWebGPUModel(): Promise<void> {
    // Simulate download progress for web-llm
    // The actual download is handled by web-llm when the model is first used
    const totalSteps = 10;
    for (let i = 1; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      await this.updateStatus('webgpu', {
        progress: Math.round((i / totalSteps) * 100),
      });
    }
  }

  /**
   * Download WASM model (NLLB)
   */
  private async downloadWASMModel(): Promise<void> {
    // Hugging Face transformers.js handles the download automatically
    // when pipeline is created. We just need to simulate progress.
    const totalSteps = 10;
    for (let i = 1; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      await this.updateStatus('wasm', {
        progress: Math.round((i / totalSteps) * 100),
      });
    }
  }

  /**
   * Delete a downloaded model
   */
  async deleteModel(modelId: LocalModelType): Promise<void> {
    if (modelId === 'chrome-ai') {
      // Chrome AI can't be deleted
      return;
    }

    try {
      // Clear from cache
      if (modelId === 'webgpu') {
        // Clear web-llm cache
        await this.clearWebLLMCache();
      } else if (modelId === 'wasm') {
        // Clear transformers.js cache
        await this.clearTransformersCache();
      }

      await this.updateStatus(modelId, {
        status: 'idle',
        progress: 0,
      });
    } catch (error) {
      await this.updateStatus(modelId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Delete failed',
      });
      throw error;
    }
  }

  /**
   * Clear web-llm model cache
   */
  private async clearWebLLMCache(): Promise<void> {
    try {
      // Clear cache via Cache API
      const cache = await caches.open('webllm-models');
      await cache.delete('webllm-models', { ignoreSearch: true });
    } catch (error) {
      console.debug('[ModelLoader] Failed to clear web-llm cache:', error);
    }
  }

  /**
   * Clear transformers.js model cache
   */
  private async clearTransformersCache(): Promise<void> {
    try {
      // Clear IndexedDB for transformers.js
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name?.startsWith('transformers')) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    } catch (error) {
      console.debug('[ModelLoader] Failed to clear transformers cache:', error);
    }
  }

  /**
   * Get total storage used by models
   */
  async getStorageUsed(): Promise<number> {
    let total = 0;
    for (const modelId of Object.keys(MODEL_REGISTRY) as LocalModelType[]) {
      const status = this.getStatus(modelId);
      if (status.status === 'downloaded') {
        total += MODEL_REGISTRY[modelId].sizeBytes;
      }
    }
    return total;
  }

  /**
   * Get recommended model based on device capabilities
   */
  getRecommendedModel(): LocalModelType {
    // Priority: Chrome AI > WebGPU > WASM
    if (this.state.statuses['chrome-ai'].status === 'downloaded') {
      return 'chrome-ai';
    }
    if (this.state.statuses['webgpu'].status === 'downloaded') {
      return 'webgpu';
    }
    return 'wasm';
  }
}

// Export singleton instance
export const modelLoader = new ModelLoader();

// Global type augmentation for Chrome AI
declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities(): Promise<{ available: 'no' | 'readily' | 'after-download' }>;
        create(options?: { systemPrompt?: string }): Promise<unknown>;
      };
    };
  }
}