/**
 * WASM Adapter
 * Uses NLLB-200 (No Language Left Behind) compiled to WASM for lightweight translation
 * Provides translation fallback when WebGPU is not available
 */

import type { TranslationEngine, TranslationResult, StreamChunk } from './index';

// NLLB model configuration
const NLLB_MODEL_CONFIG = {
  model: 'nllb-200-distilled-600M',
  quantized: true,
} as const;

// WASM inference session type
interface WASMSession {
  translate(input: string, sourceLang: string, targetLang: string): Promise<string>;
  getTokens(text: string): Promise<string[]>;
  destroy(): void;
}

// Model status tracking
interface ModelStatus {
  loaded: boolean;
  loading: boolean;
  progress: number;
  error?: string;
}

// Language code mapping for NLLB (uses ISO 639-3 codes)
const NLLB_LANGUAGE_CODES: Record<string, string> = {
  en: 'eng_Latn',
  zh: 'zho_Hans',
  ja: 'jpn_Jpan',
  ko: 'kor_Hang',
  fr: 'fra_Latn',
  de: 'deu_Latn',
  es: 'spa_Latn',
  pt: 'por_Latn',
  it: 'ita_Latn',
  ru: 'rus_Cyrl',
  ar: 'arb_Arab',
  hi: 'hin_Deva',
  th: 'tha_Thai',
  vi: 'vie_Latn',
};

// Transformers module type
interface TransformersPipeline {
  (task: string, model: string, options?: Record<string, unknown>): Promise<{
    (input: string, options?: Record<string, unknown>): Promise<Array<{ translation_text: string }>>;
  }>;
}

interface TransformersEnv {
  allowLocalModels: boolean;
  useBrowserCache: boolean;
}

interface TransformersModule {
  pipeline: TransformersPipeline;
  env: TransformersEnv;
}

// Module loader - returns null if module not available
let transformersModule: TransformersModule | null = null;
let transformersLoadAttempted = false;

/**
 * Load transformers.js module dynamically
 * Returns null if module is not available (not installed)
 */
async function loadTransformers(): Promise<TransformersModule | null> {
  if (transformersLoadAttempted) {
    return transformersModule;
  }
  transformersLoadAttempted = true;

  try {
    // Dynamic import - will fail at build time if module not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import('@huggingface/transformers');
    transformersModule = {
      pipeline: mod.pipeline,
      env: mod.env,
    };
    return transformersModule;
  } catch (error) {
    console.debug('[WASM] @huggingface/transformers not available:', error);
    transformersModule = null;
    return null;
  }
}

/**
 * WASM Adapter using NLLB-200
 * Provides lightweight CPU-based translation using WASM
 */
export class WASMAdapter implements TranslationEngine {
  readonly id = 'wasm';
  readonly name = 'WASM (NLLB-200)';
  readonly category: 'local' = 'local';
  readonly priority = 3;

  readonly capabilities = {
    supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'hi', 'th', 'vi'],
    maxTextLength: 2048,
  };

  private session: WASMSession | null = null;
  private status: ModelStatus = {
    loaded: false,
    loading: false,
    progress: 0,
  };
  private loadingPromise: Promise<void> | null = null;

  /**
   * Check if WASM translation is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      if (typeof WebAssembly === 'undefined') {
        return false;
      }

      if (this.status.loaded) {
        return true;
      }

      if (this.status.loading) {
        try {
          await this.loadingPromise;
          return this.status.loaded;
        } catch {
          return false;
        }
      }

      await this.ensureModel();
      return this.status.loaded;
    } catch {
      return false;
    }
  }

  /**
   * Load the WASM translation model
   */
  private async ensureModel(): Promise<void> {
    if (this.session) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.status.loading = true;
    this.loadingPromise = this.loadModel();
    return this.loadingPromise;
  }

  /**
   * Actually load the model
   */
  private async loadModel(): Promise<void> {
    try {
      console.debug('[WASM] Loading NLLB-200 model...');

      // Try to load transformers.js
      const transformers = await loadTransformers();

      if (!transformers) {
        throw new Error('@huggingface/transformers not installed. Please install it to use WASM translation.');
      }

      const { pipeline, env } = transformers;

      // Configure for WASM backend
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      // Create translation pipeline with NLLB
      const translator = await pipeline('translation', NLLB_MODEL_CONFIG.model, {
        device: 'wasm',
        quantized: NLLB_MODEL_CONFIG.quantized,
      });

      // Create a wrapper session
      this.session = {
        translate: async (input: string, sourceLang: string, targetLang: string): Promise<string> => {
          const srcCode = this.toNLLBCode(sourceLang);
          const tgtCode = this.toNLLBCode(targetLang);

          const result = await translator(input, {
            src_lang: srcCode,
            tgt_lang: tgtCode,
          });

          return result[0]?.translation_text || '';
        },

        getTokens: async (text: string): Promise<string[]> => {
          return text.split(/\s+/).filter(Boolean);
        },

        destroy: () => {
          this.session = null;
        },
      };

      this.status.loaded = true;
      this.status.loading = false;
      this.status.progress = 100;
      console.debug('[WASM] Model loaded successfully');
    } catch (error) {
      this.status.loading = false;
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      this.session = null;
      this.loadingPromise = null;
      throw new Error(`Failed to load WASM model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert standard language code to NLLB format
   */
  private toNLLBCode(code: string): string {
    return NLLB_LANGUAGE_CODES[code] || code;
  }

  /**
   * Get current model status
   */
  getStatus(): ModelStatus {
    return { ...this.status };
  }

  /**
   * Translate text using NLLB-200 WASM
   */
  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    const startTime = Date.now();

    if (!this.session) {
      await this.ensureModel();
    }

    if (!this.session) {
      throw new Error('WASM translation model not loaded');
    }

    try {
      const translatedText = await this.session.translate(text, from, to);

      return {
        translatedText: translatedText.trim(),
        engine: this.id,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`WASM translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream translation - NLLB doesn't support true streaming
   * Yields the complete result when available
   */
  async *stream(text: string, from: string, to: string): AsyncGenerator<StreamChunk> {
    if (!this.session) {
      await this.ensureModel();
    }

    if (!this.session) {
      throw new Error('WASM translation model not loaded');
    }

    try {
      const translatedText = await this.session.translate(text, from, to);

      yield { delta: translatedText, done: false };
      yield { delta: '', done: true };
    } catch (error) {
      throw new Error(`WASM streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
    this.status.loaded = false;
    this.status.loading = false;
    this.status.progress = 0;
    this.loadingPromise = null;
  }

  /**
   * Get download progress
   */
  getProgress(): number {
    return this.status.progress;
  }

  /**
   * Estimate memory usage
   */
  getMemoryEstimate(): { model: number; wasm: number } {
    return {
      model: 250,
      wasm: 50,
    };
  }
}

// Export singleton instance
export const wasmAdapter = new WASMAdapter();