/**
 * WebGPU Adapter
 * Uses web-llm library for WebGPU-accelerated local LLM inference
 * Supports models like Qwen2.5, Llama variants for translation and processing
 */

import type { TranslationEngine, TranslationResult, StreamChunk } from './index';

// WebLLM module type (loaded dynamically)
interface WebLLMModule {
  CreateChatModule(options: { model: string }): Promise<WebLLMChat>;
}

interface GenerationConfig {
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
}

interface WebLLMChat {
  expressCurrentGeneratedText(): string;
  prefill(prompt: string): Promise<void>;
  generate(prompt: string, config?: GenerationConfig): Promise<string>;
  resetChat(): void;
  unload(): void;
}

// Model configurations for web-llm
const WEBLLM_MODELS = {
  'qwen2.5-0.5b': {
    model: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    displayName: 'Qwen 2.5 0.5B',
    description: 'Lightweight, fast translation model',
  },
  'qwen2.5-1.5b': {
    model: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    displayName: 'Qwen 2.5 1.5B',
    description: 'Balanced performance and quality',
  },
  'qwen2.5-3b': {
    model: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    displayName: 'Qwen 2.5 3B',
    description: 'Higher quality translations',
  },
  'llama-3.2-1b': {
    model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    displayName: 'Llama 3.2 1B',
    description: 'Meta\'s lightweight model',
  },
} as const;

type WebLLMModelId = keyof typeof WEBLLM_MODELS;

// Translation prompt template
const TRANSLATION_PROMPT = `You are a professional translator. Translate the following text from {sourceLang} to {targetLang}. Provide only the translation, no explanations.

{sourceLang} text:
{text}

{targetLang} translation:`;

const SYSTEM_PROMPT = 'You are a professional, accurate translator. Provide only translations without explanations or commentary.';

// web-llm module lazy loader
type WebLLMModuleType = typeof import('@mlc-ai/web-llm');
let webLLMModule: WebLLMModuleType | null = null;
let webLLMLoadAttempted = false;

/**
 * Load web-llm module dynamically
 * Returns null if module is not available (not installed)
 */
async function loadWebLLM(): Promise<WebLLMModuleType | null> {
  if (webLLMLoadAttempted) {
    return webLLMModule;
  }
  webLLMLoadAttempted = true;

  try {
    // Dynamic import - will fail at build time if module not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import('@mlc-ai/web-llm');
    webLLMModule = mod as WebLLMModuleType;
    return webLLMModule;
  } catch (error) {
    console.debug('[WebGPU] @mlc-ai/web-llm not available:', error);
    webLLMModule = null;
    return null;
  }
}

/**
 * WebGPU Adapter using web-llm
 * Provides WebGPU-accelerated LLM inference for translation
 */
export class WebGPUAdapter implements TranslationEngine {
  readonly id = 'webgpu';
  readonly name = 'WebGPU (web-llm)';
  readonly category: 'local' = 'local';
  readonly priority = 2; // After Chrome AI, before cloud providers

  readonly capabilities = {
    supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'hi', 'th', 'vi'],
    maxTextLength: 4096,
  };

  private chat: WebLLMChat | null = null;
  private modelId: WebLLMModelId = 'qwen2.5-0.5b';
  private loadingPromise: Promise<void> | null = null;
  private isWebGPUSupported = false;

  constructor() {
    this.checkWebGPUSupport();
  }

  /**
   * Check if WebGPU is supported in the browser
   */
  private async checkWebGPUSupport(): Promise<boolean> {
    try {
      if (!('gpu' in navigator)) {
        console.debug('[WebGPU] WebGPU not available in navigator');
        this.isWebGPUSupported = false;
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.debug('[WebGPU] No GPU adapter found');
        this.isWebGPUSupported = false;
        return false;
      }

      this.isWebGPUSupported = true;
      console.debug('[WebGPU] WebGPU is supported');
      return true;
    } catch (error) {
      console.error('[WebGPU] Error checking WebGPU support:', error);
      this.isWebGPUSupported = false;
      return false;
    }
  }

  /**
   * Check if the adapter is ready
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.isWebGPUSupported) {
      return false;
    }

    // If chat is already loaded, we're ready
    if (this.chat) {
      return true;
    }

    // Try to load the model
    try {
      await this.ensureModel();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load the web-llm module and model
   */
  private async ensureModel(): Promise<void> {
    if (this.chat) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadModel();
    return this.loadingPromise;
  }

  /**
   * Actually load the model
   */
  private async loadModel(): Promise<void> {
    try {
      // Dynamically import web-llm
      const webLLM = await loadWebLLM();

      if (!webLLM) {
        throw new Error('@mlc-ai/web-llm not installed. Please install it to use WebGPU translation.');
      }

      const modelConfig = WEBLLM_MODELS[this.modelId];

      console.debug(`[WebGPU] Loading model: ${modelConfig.displayName}`);

      // Create chat module
      const chat = await webLLM.CreateChatModule({
        model: modelConfig.model,
      });

      // Preload with system prompt
      await chat.prefill(SYSTEM_PROMPT);

      this.chat = chat;
      console.debug('[WebGPU] Model loaded successfully');
    } catch (error) {
      this.chat = null;
      this.loadingPromise = null;
      throw new Error(`Failed to load WebLLM model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set the model to use
   */
  async setModel(modelId: WebLLMModelId): Promise<void> {
    if (modelId === this.modelId && this.chat) {
      return;
    }

    // Unload current model
    if (this.chat) {
      await this.chat.unload();
      this.chat = null;
    }

    this.modelId = modelId;
    this.loadingPromise = null;

    // Load new model
    await this.ensureModel();
  }

  /**
   * Get available models
   */
  getAvailableModels(): ReadonlyArray<{ id: WebLLMModelId; name: string; description: string }> {
    return Object.entries(WEBLLM_MODELS).map(([id, config]) => ({
      id: id as WebLLMModelId,
      name: config.displayName,
      description: config.description,
    }));
  }

  /**
   * Get current model info
   */
  getCurrentModel(): { id: WebLLMModelId; name: string } {
    const config = WEBLLM_MODELS[this.modelId];
    return {
      id: this.modelId,
      name: config.displayName,
    };
  }

  /**
   * Translate text using WebGPU (web-llm)
   */
  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    const startTime = Date.now();

    if (!this.chat) {
      await this.ensureModel();
    }

    if (!this.chat) {
      throw new Error('WebLLM model not loaded');
    }

    const prompt = this.buildPrompt(text, from, to);

    try {
      await this.chat.prefill(prompt);
      const result = await this.chat.generate(prompt);

      return {
        translatedText: result.trim(),
        engine: this.id,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`WebGPU translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream translation using WebGPU
   */
  async *stream(text: string, from: string, to: string): AsyncGenerator<StreamChunk> {
    if (!this.chat) {
      await this.ensureModel();
    }

    if (!this.chat) {
      throw new Error('WebLLM model not loaded');
    }

    const prompt = this.buildPrompt(text, from, to);

    try {
      // Reset chat state
      this.chat.resetChat();

      // Start generation
      const finishPromise = this.chat.generate(prompt);

      // Yield chunks as they become available
      let lastText = '';
      while (true) {
        // Check for new content
        const currentText = this.chat.expressCurrentGeneratedText();

        if (currentText !== lastText) {
          const delta = currentText.slice(lastText.length);
          yield { delta, done: false };
          lastText = currentText;
        }

        // Check if generation is complete
        try {
          await new Promise(resolve => setTimeout(resolve, 50));
          // If we can get the result without timeout, it's done
          const result = await Promise.race([
            finishPromise,
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 100)),
          ]).catch(() => null);

          if (result !== null) {
            // Final chunk with any remaining text
            const finalText = this.chat.expressCurrentGeneratedText();
            if (finalText !== lastText) {
              yield { delta: finalText.slice(lastText.length), done: false };
            }
            yield { delta: '', done: true };
            break;
          }
        } catch {
          // Timeout, continue loop
        }
      }
    } catch (error) {
      throw new Error(`WebGPU streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build translation prompt
   */
  private buildPrompt(text: string, from: string, to: string): string {
    return TRANSLATION_PROMPT
      .replace('{sourceLang}', this.getLanguageName(from))
      .replace('{targetLang}', this.getLanguageName(to))
      .replace('{text}', text);
  }

  /**
   * Convert language code to language name
   */
  private getLanguageName(code: string): string {
    const languageNames: Record<string, string> = {
      en: 'English',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      fr: 'French',
      de: 'German',
      es: 'Spanish',
      pt: 'Portuguese',
      it: 'Italian',
      ru: 'Russian',
      ar: 'Arabic',
      hi: 'Hindi',
      th: 'Thai',
      vi: 'Vietnamese',
    };
    return languageNames[code] || code;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.chat) {
      await this.chat.unload();
      this.chat = null;
    }
    this.loadingPromise = null;
  }

  /**
   * Get download progress if model is loading
   */
  getProgress(): number {
    // WebLLM doesn't expose progress directly in the public API
    // This would need to be implemented based on specific web-llm version
    return this.chat ? 100 : 0;
  }
}

// Export singleton instance
export const webGPUAdapter = new WebGPUAdapter();