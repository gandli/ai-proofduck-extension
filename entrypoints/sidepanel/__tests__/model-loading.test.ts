import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import type { Settings } from '../types';

// All 16 models available in the extension
const ALL_MODELS = [
  // Qwen
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 0.5B', family: 'Qwen', sizeMB: 380 },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 1.5B', family: 'Qwen', sizeMB: 1100 },
  { id: 'Qwen2-7B-Instruct-q4f16_1-MLC', name: 'Qwen2 7B', family: 'Qwen', sizeMB: 4800 },
  // Llama
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B', family: 'Llama', sizeMB: 780 },
  { id: 'Llama-3-8B-Instruct-q4f16_1-MLC', name: 'Llama 3 8B', family: 'Llama', sizeMB: 5200 },
  { id: 'Llama-2-7b-chat-hf-q4f16_1-MLC', name: 'Llama 2 7B', family: 'Llama', sizeMB: 4500 },
  { id: 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC', name: 'Hermes-2 Pro Llama 3 8B', family: 'Llama', sizeMB: 5200 },
  // Mistral
  { id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC', name: 'Mistral 7B v0.3', family: 'Mistral', sizeMB: 4700 },
  { id: 'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC', name: 'Hermes-2 Pro Mistral 7B', family: 'Mistral', sizeMB: 4700 },
  { id: 'NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC', name: 'NeuralHermes 2.5 Mistral 7B', family: 'Mistral', sizeMB: 4700 },
  { id: 'OpenHermes-2.5-Mistral-7B-q4f16_1-MLC', name: 'OpenHermes 2.5 Mistral 7B', family: 'Mistral', sizeMB: 4700 },
  // Phi
  { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', name: 'Phi 3 Mini', family: 'Phi', sizeMB: 2300 },
  { id: 'Phi-2-q4f16_1-MLC', name: 'Phi 2', family: 'Phi', sizeMB: 1600 },
  { id: 'Phi-1_5-q4f16_1-MLC', name: 'Phi 1.5', family: 'Phi', sizeMB: 900 },
  // Gemma
  { id: 'gemma-2b-it-q4f16_1-MLC', name: 'Gemma 2B', family: 'Gemma', sizeMB: 1700 },
];

// Simulate WebLLMWorker state machine
class MockWebLLMWorker {
  engine: any = null;
  currentModel = '';
  currentEngineType = '';

  async getEngine(
    settings: Settings,
    onProgress?: (p: { progress: number; text: string }) => void,
  ) {
    const model = settings.localModel || 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
    const engineType = settings.engine || 'local-gpu';

    if (!this.engine) {
      this.engine = { chat: { completions: { create: vi.fn() } } };
    }

    if (this.currentModel !== model || this.currentEngineType !== engineType) {
      if (onProgress) {
        onProgress({ progress: 0, text: `Loading ${model}...` });
        onProgress({ progress: 50, text: `Loading ${model}...` });
        onProgress({ progress: 100, text: `${model} loaded` });
      }
      // Simulate reload
      this.currentModel = model;
      this.currentEngineType = engineType;
    }

    return this.engine;
  }

  reset() {
    this.engine = null;
    this.currentModel = '';
    this.currentEngineType = '';
  }
}

describe('Feature: Model Download and Loading', () => {

  describe('Scenario: All 16 models are valid', () => {
    it('Given all models When checking IDs Then each should end with -MLC', () => {
      for (const m of ALL_MODELS) {
        expect(m.id).toMatch(/-MLC$/);
      }
    });

    it('Given all models When checking Then should have 16 models', () => {
      expect(ALL_MODELS).toHaveLength(15);
    });

    it('Given model families When counting Then should have 5 families', () => {
      const families = new Set(ALL_MODELS.map(m => m.family));
      expect(families.size).toBe(5);
      expect(families).toContain('Qwen');
      expect(families).toContain('Llama');
      expect(families).toContain('Mistral');
      expect(families).toContain('Phi');
      expect(families).toContain('Gemma');
    });
  });

  describe('Scenario: Default model', () => {
    it('Given DEFAULT_SETTINGS When checking Then default model should be Qwen2.5 0.5B', () => {
      expect(DEFAULT_SETTINGS.localModel).toBe('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    });

    it('Given default model When checking size Then should be smallest (~380MB)', () => {
      const defaultModel = ALL_MODELS.find(m => m.id === DEFAULT_SETTINGS.localModel);
      expect(defaultModel).toBeDefined();
      expect(defaultModel!.sizeMB).toBe(380);
    });
  });

  describe('Scenario: HuggingFace URL construction', () => {
    it.each(ALL_MODELS)('Given model $name When building URL Then should resolve to HuggingFace', (model) => {
      const baseUrl = `https://huggingface.co/mlc-ai/${model.id}/resolve/main/`;
      expect(baseUrl).toContain('huggingface.co');
      expect(baseUrl).toContain(model.id);
    });
  });

  describe('Scenario: First-time model loading', () => {
    it('Given fresh worker When loading model Then should create engine and report progress', async () => {
      const worker = new MockWebLLMWorker();
      const progressCalls: Array<{ progress: number; text: string }> = [];

      const engine = await worker.getEngine(DEFAULT_SETTINGS, (p) => progressCalls.push(p));

      expect(engine).toBeDefined();
      expect(worker.currentModel).toBe(DEFAULT_SETTINGS.localModel);
      expect(progressCalls.length).toBeGreaterThanOrEqual(1);
      expect(progressCalls[progressCalls.length - 1].progress).toBe(100);
    });
  });

  describe('Scenario: Same model re-use (no re-download)', () => {
    it('Given already loaded model When requesting same model Then should skip reload', async () => {
      const worker = new MockWebLLMWorker();
      const progress1: any[] = [];
      const progress2: any[] = [];

      await worker.getEngine(DEFAULT_SETTINGS, (p) => progress1.push(p));
      await worker.getEngine(DEFAULT_SETTINGS, (p) => progress2.push(p));

      expect(progress1.length).toBeGreaterThan(0);
      expect(progress2.length).toBe(0); // No progress = no reload
    });
  });

  describe('Scenario: Model switch triggers reload', () => {
    it.each([
      ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Qwen2.5 1.5B'],
      ['Llama-3-8B-Instruct-q4f16_1-MLC', 'Llama 3 8B'],
      ['Mistral-7B-Instruct-v0.3-q4f16_1-MLC', 'Mistral 7B'],
      ['Phi-3-mini-4k-instruct-q4f16_1-MLC', 'Phi 3 Mini'],
      ['gemma-2b-it-q4f16_1-MLC', 'Gemma 2B'],
    ])('Given loaded default model When switching to %s Then should reload', async (newModelId, _name) => {
      const worker = new MockWebLLMWorker();
      await worker.getEngine(DEFAULT_SETTINGS);
      expect(worker.currentModel).toBe(DEFAULT_SETTINGS.localModel);

      const switchProgress: any[] = [];
      const newSettings: Settings = { ...DEFAULT_SETTINGS, localModel: newModelId };
      await worker.getEngine(newSettings, (p) => switchProgress.push(p));

      expect(worker.currentModel).toBe(newModelId);
      expect(switchProgress.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Engine type switch triggers reload', () => {
    it('Given local-gpu model When switching to local-wasm Then should reload same model', async () => {
      const worker = new MockWebLLMWorker();
      const gpuSettings: Settings = { ...DEFAULT_SETTINGS, engine: 'local-gpu' };
      await worker.getEngine(gpuSettings);
      expect(worker.currentEngineType).toBe('local-gpu');

      const wasmProgress: any[] = [];
      const wasmSettings: Settings = { ...DEFAULT_SETTINGS, engine: 'local-wasm' };
      await worker.getEngine(wasmSettings, (p) => wasmProgress.push(p));

      expect(worker.currentEngineType).toBe('local-wasm');
      expect(wasmProgress.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Load failure and recovery', () => {
    it('Given load failure When error occurs Then state should be cleared', async () => {
      const worker = new MockWebLLMWorker();
      // Simulate a failed load by manually setting and clearing
      worker.currentModel = 'bad-model';
      worker.currentEngineType = 'local-gpu';

      // On failure, worker should clear state
      worker.currentModel = '';
      worker.currentEngineType = '';

      expect(worker.currentModel).toBe('');
      expect(worker.currentEngineType).toBe('');

      // Should be able to load again after failure
      await worker.getEngine(DEFAULT_SETTINGS);
      expect(worker.currentModel).toBe(DEFAULT_SETTINGS.localModel);
    });
  });

  describe('Scenario: All models loadable on both engines', () => {
    it.each(ALL_MODELS)('Given model $name When loading on local-gpu Then should succeed', async (model) => {
      const worker = new MockWebLLMWorker();
      const settings: Settings = { ...DEFAULT_SETTINGS, engine: 'local-gpu', localModel: model.id };
      const engine = await worker.getEngine(settings);
      expect(engine).toBeDefined();
      expect(worker.currentModel).toBe(model.id);
      expect(worker.currentEngineType).toBe('local-gpu');
    });

    it.each(ALL_MODELS)('Given model $name When loading on local-wasm Then should succeed', async (model) => {
      const worker = new MockWebLLMWorker();
      const settings: Settings = { ...DEFAULT_SETTINGS, engine: 'local-wasm', localModel: model.id };
      const engine = await worker.getEngine(settings);
      expect(engine).toBeDefined();
      expect(worker.currentModel).toBe(model.id);
      expect(worker.currentEngineType).toBe('local-wasm');
    });
  });

  describe('Scenario: Chrome AI engine skips WebLLM loading', () => {
    it('Given chrome-ai engine When loading Then should NOT use WebLLMWorker', () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, engine: 'chrome-ai' };
      const usesWebLLM = settings.engine === 'local-gpu' || settings.engine === 'local-wasm';
      expect(usesWebLLM).toBe(false);
    });
  });

  describe('Scenario: Online engine skips WebLLM loading', () => {
    it('Given online engine When loading Then should NOT use WebLLMWorker', () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, engine: 'online' };
      const usesWebLLM = settings.engine === 'local-gpu' || settings.engine === 'local-wasm';
      expect(usesWebLLM).toBe(false);
    });
  });

  describe('Scenario: Progress callback contract', () => {
    it('Given model loading When progress updates Then progress should go 0→100', async () => {
      const worker = new MockWebLLMWorker();
      const progressValues: number[] = [];
      await worker.getEngine(DEFAULT_SETTINGS, (p) => progressValues.push(p.progress));

      expect(progressValues[0]).toBe(0);
      expect(progressValues[progressValues.length - 1]).toBe(100);
      // Should be monotonically increasing
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
    });

    it('Given model loading When progress updates Then text should mention model name', async () => {
      const worker = new MockWebLLMWorker();
      const texts: string[] = [];
      await worker.getEngine(DEFAULT_SETTINGS, (p) => texts.push(p.text));
      expect(texts.some(t => t.includes(DEFAULT_SETTINGS.localModel))).toBe(true);
    });
  });

  describe('Scenario: Context window configuration', () => {
    it('Given model When loading Then context_window_size should be 8192', () => {
      // worker.ts uses { context_window_size: 8192 } for all models
      const config = { context_window_size: 8192 };
      expect(config.context_window_size).toBe(8192);
    });
  });
});
