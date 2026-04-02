/**
 * Gemini Adapter
 * Google AI Gemini API format
 */

import type { TranslationEngine, TranslationResult, LLMConfig, StreamChunk } from './index';
import { useSettingsStore } from '../stores/settings';

// Prompt templates for different AI modes
const PROMPT_TEMPLATES = {
  translate: (text: string, from: string, to: string) =>
    `Translate the following text from ${from} to ${to}:\n\n${text}`,

  proofread: (text: string) =>
    `Proofread and correct the following text. Provide only the corrected version:\n\n${text}`,

  polish: (text: string) =>
    `Polish and improve the following text to make it more elegant and clear. Provide only the improved version:\n\n${text}`,

  expand: (text: string) =>
    `Expand and elaborate on the following text with more details and depth. Provide only the expanded version:\n\n${text}`,
};

export class GeminiAdapter implements TranslationEngine {
  readonly id = 'gemini';
  readonly name = 'Gemini';
  readonly category: 'llm' = 'llm';
  readonly priority = 11;

  readonly capabilities = {
    supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'hi', 'th', 'vi'],
    maxTextLength: 128000, // Gemini supports up to 128k tokens
  };

  private config: LLMConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from settings store
   */
  private loadConfig(): void {
    const settings = useSettingsStore.getState();
    const apiKeyConfig = settings.getAPIKey('gemini');

    if (apiKeyConfig?.apiKey && apiKeyConfig?.enabled) {
      this.config = {
        apiKey: apiKeyConfig.apiKey,
        baseUrl: apiKeyConfig.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
        model: apiKeyConfig.model || 'gemini-2.0-flash',
      };
    }
  }

  /**
   * Check if the adapter is properly configured
   */
  async checkAvailability(): Promise<boolean> {
    this.loadConfig();
    return this.config !== null && this.config.apiKey.length > 0;
  }

  /**
   * Build the request URL for the API
   */
  private buildUrl(path: string): string {
    const baseUrl = this.config?.baseUrl?.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com/v1beta';
    const model = this.config?.model || 'gemini-2.0-flash';
    return `${baseUrl}/models/${model}${path}`;
  }

  /**
   * Build headers for API request
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Build query string with API key
   */
  private buildQueryString(): string {
    return `?key=${this.config?.apiKey}`;
  }

  /**
   * Translate text using Gemini API
   */
  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    if (!(await this.checkAvailability())) {
      throw new Error('Gemini API is not configured. Please set your API key in settings.');
    }

    const prompt = PROMPT_TEMPLATES.translate(text, from, to);
    const startTime = Date.now();

    try {
      const response = await fetch(this.buildUrl(':generateContent') + this.buildQueryString(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      return {
        translatedText,
        engine: this.id,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini translation failed: ${error.message}`);
      }
      throw new Error('Gemini translation failed: Unknown error');
    }
  }

  /**
   * Stream translation using Gemini API with SSE
   */
  async *stream(text: string, from: string, to: string): AsyncGenerator<StreamChunk> {
    if (!(await this.checkAvailability())) {
      throw new Error('Gemini API is not configured. Please set your API key in settings.');
    }

    const prompt = PROMPT_TEMPLATES.translate(text, from, to);

    try {
      const response = await fetch(this.buildUrl(':streamGenerateContent') + this.buildQueryString() + '&alt=sse', {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Gemini streaming response: No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Process SSE stream
      const reader = response.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) {
              continue;
            }

            // Parse SSE data format: "data: {...}"
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6);

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text;

                if (delta) {
                  yield { delta, done: false };
                }

                // Check for finish reason
                if (parsed.candidates?.[0]?.finishReason) {
                  yield { delta: '', done: true };
                  return;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      yield { delta: '', done: true };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini streaming failed: ${error.message}`);
      }
      throw new Error('Gemini streaming failed: Unknown error');
    }
  }

  /**
   * Process text with the model (for proofread, polish, expand modes)
   */
  async processText(text: string, mode: 'proofread' | 'polish' | 'expand'): Promise<string> {
    if (!(await this.checkAvailability())) {
      throw new Error('Gemini API is not configured. Please set your API key in settings.');
    }

    const template = PROMPT_TEMPLATES[mode];
    const prompt = template(text);

    try {
      const response = await fetch(this.buildUrl(':generateContent') + this.buildQueryString(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini ${mode} failed: ${error.message}`);
      }
      throw new Error(`Gemini ${mode} failed: Unknown error`);
    }
  }

  /**
   * Stream text processing with SSE support
   */
  async *streamProcess(text: string, mode: 'proofread' | 'polish' | 'expand'): AsyncGenerator<StreamChunk> {
    if (!(await this.checkAvailability())) {
      throw new Error('Gemini API is not configured. Please set your API key in settings.');
    }

    const template = PROMPT_TEMPLATES[mode];
    const prompt = template(text);

    try {
      const response = await fetch(this.buildUrl(':streamGenerateContent') + this.buildQueryString() + '&alt=sse', {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Gemini streaming response: No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const reader = response.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();

            if (!trimmedLine) {
              continue;
            }

            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6);

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text;

                if (delta) {
                  yield { delta, done: false };
                }

                if (parsed.candidates?.[0]?.finishReason) {
                  yield { delta: '', done: true };
                  return;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      yield { delta: '', done: true };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini ${mode} streaming failed: ${error.message}`);
      }
      throw new Error(`Gemini ${mode} streaming failed: Unknown error`);
    }
  }
}

// Export singleton instance
export const geminiAdapter = new GeminiAdapter();