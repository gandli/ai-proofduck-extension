/**
 * Chrome AI Adapter
 * Uses Chrome's built-in Gemini Nano (Prompt API) for on-device AI processing
 * Falls back to Language Model API when available
 */

import type { TranslationEngine, TranslationResult, StreamChunk } from './index';

// Chrome AI API types (built-in)
interface ChromeAIInitialCapabilities {
  languageModel?: {
    create(): Promise<ChromeAILanguageModel>;
  };
}

interface ChromeAILanguageModel {
  prompt(text: string): Promise<string>;
  promptStreaming(text: string): ReadableStream<string>;
  destroy(): void;
}

// Prompt API session (newer Chrome AI API)
interface AIGeneratedSession {
  prompt(text: string): Promise<string>;
  promptStreaming(text: string): ReadableStream<string>;
  destroy(): void;
}

interface AIChromeAI {
  languageModel?: {
    create(options?: { systemPrompt?: string }): Promise<AIGeneratedSession>;
  };
}

// Global window type augmentation
declare global {
  interface Window {
    ai?: AIChromeAI;
  }
}

// Prompt template for translation
const TRANSLATION_PROMPT = `You are a professional translator. Translate the following text from {sourceLang} to {targetLang}. Provide only the translation, no explanations.

Text to translate:
{text}`;

/**
 * Chrome AI Adapter for Gemini Nano
 * Provides on-device AI translation using Chrome's built-in Prompt API
 */
export class ChromeAIAdapter implements TranslationEngine {
  readonly id = 'chrome-ai';
  readonly name = 'Chrome AI (Gemini Nano)';
  readonly category: 'local' = 'local';
  readonly priority = 1; // Highest priority - runs locally

  readonly capabilities = {
    supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'hi', 'th', 'vi'],
    maxTextLength: 8192, // Gemini Nano context limit
  };

  private session: AIGeneratedSession | null = null;
  private isInitialized = false;

  /**
   * Check if Chrome AI (Gemini Nano) is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Check if window.ai exists with languageModel capability
      if (!window.ai?.languageModel) {
        console.debug('[ChromeAI] Prompt API not available');
        return false;
      }

      // Try to create a session to verify availability
      const capabilities = await window.ai.languageModel.capabilities();
      if (capabilities.available === 'no') {
        console.debug('[ChromeAI] Model not available');
        return false;
      }

      return capabilities.available === 'readily' || capabilities.available === 'after-download';
    } catch (error) {
      console.error('[ChromeAI] Availability check failed:', error);
      return false;
    }
  }

  /**
   * Initialize the Chrome AI session
   */
  private async ensureSession(): Promise<AIGeneratedSession> {
    if (this.session && this.isInitialized) {
      return this.session;
    }

    if (!window.ai?.languageModel) {
      throw new Error('Chrome AI Prompt API is not available');
    }

    try {
      this.session = await window.ai.languageModel.create({
        systemPrompt: 'You are a professional, accurate translator. Only provide translations.',
      });
      this.isInitialized = true;
      return this.session;
    } catch (error) {
      this.isInitialized = false;
      throw new Error(`Failed to initialize Chrome AI session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Translate text using Chrome AI (Gemini Nano)
   */
  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    const startTime = Date.now();

    try {
      const session = await this.ensureSession();
      const prompt = TRANSLATION_PROMPT
        .replace('{sourceLang}', this.getLanguageName(from))
        .replace('{targetLang}', this.getLanguageName(to))
        .replace('{text}', text);

      const translatedText = await session.prompt(prompt);

      return {
        translatedText: translatedText.trim(),
        engine: this.id,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Chrome AI translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream translation using Chrome AI with SSE-compatible chunks
   */
  async *stream(text: string, from: string, to: string): AsyncGenerator<StreamChunk> {
    const session = await this.ensureSession();
    const prompt = TRANSLATION_PROMPT
      .replace('{sourceLang}', this.getLanguageName(from))
      .replace('{targetLang}', this.getLanguageName(to))
      .replace('{text}', text);

    try {
      const stream = session.promptStreaming(prompt);
      const reader = stream.getReader();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            yield { delta: '', done: true };
            break;
          }

          fullText += value;
          yield { delta: value, done: false };
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw new Error(`Chrome AI streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup session
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
      this.isInitialized = false;
    }
  }

  /**
   * Convert language code to language name for prompts
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
}

// Export singleton instance
export const chromeAIAdapter = new ChromeAIAdapter();