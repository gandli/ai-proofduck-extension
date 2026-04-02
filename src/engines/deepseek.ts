/**
 * DeepSeek Adapter
 * DeepSeek API compatible interface (OpenAI compatible format)
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

export class DeepSeekAdapter implements TranslationEngine {
  readonly id = 'deepseek';
  readonly name = 'DeepSeek';
  readonly category: 'llm' = 'llm';
  readonly priority = 15;

  readonly capabilities = {
    supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'hi', 'th', 'vi'],
    maxTextLength: 128000, // DeepSeek supports up to 128k tokens
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
    const apiKeyConfig = settings.getAPIKey('deepseek');

    if (apiKeyConfig?.apiKey && apiKeyConfig?.enabled) {
      this.config = {
        apiKey: apiKeyConfig.apiKey,
        baseUrl: apiKeyConfig.baseUrl || 'https://api.deepseek.com/v1',
        model: apiKeyConfig.model || 'deepseek-chat',
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
    const baseUrl = this.config?.baseUrl?.replace(/\/$/, '') || 'https://api.deepseek.com/v1';
    return `${baseUrl}${path}`;
  }

  /**
   * Build headers for API request
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config?.apiKey}`,
    };
  }

  /**
   * Translate text using DeepSeek API
   */
  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    if (!(await this.checkAvailability())) {
      throw new Error('DeepSeek API is not configured. Please set your API key in settings.');
    }

    const prompt = PROMPT_TEMPLATES.translate(text, from, to);

    try {
      const response = await fetch(this.buildUrl('/chat/completions'), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config?.model || 'deepseek-chat',
          messages: [
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content?.trim() || '';

      return {
        translatedText,
        engine: this.id,
        duration: Date.now() - (data.created ? data.created * 1000 : Date.now()),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`DeepSeek translation failed: ${error.message}`);
      }
      throw new Error('DeepSeek translation failed: Unknown error');
    }
  }

  /**
   * Stream translation using DeepSeek API with SSE
   */
  async *stream(text: string, from: string, to: string): AsyncGenerator<StreamChunk> {
    if (!(await this.checkAvailability())) {
      throw new Error('DeepSeek API is not configured. Please set your API key in settings.');
    }

    const prompt = PROMPT_TEMPLATES.translate(text, from, to);

    try {
      const response = await fetch(this.buildUrl('/chat/completions'), {
        method: 'POST',
        headers: {
          ...this.buildHeaders(),
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: this.config?.model || 'deepseek-chat',
          messages: [
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('DeepSeek streaming response: No response body');
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

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith(':')) {
              continue;
            }

            // Parse SSE data format: "data: {...}"
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6);

              // Check for streaming done
              if (data === '[DONE]') {
                yield { delta: '', done: true };
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;

                if (delta) {
                  yield { delta, done: false };
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
        throw new Error(`DeepSeek streaming failed: ${error.message}`);
      }
      throw new Error('DeepSeek streaming failed: Unknown error');
    }
  }

  /**
   * Process text with the model (for proofread, polish, expand modes)
   */
  async processText(text: string, mode: 'proofread' | 'polish' | 'expand'): Promise<string> {
    if (!(await this.checkAvailability())) {
      throw new Error('DeepSeek API is not configured. Please set your API key in settings.');
    }

    const template = PROMPT_TEMPLATES[mode];
    const prompt = template(text);

    try {
      const response = await fetch(this.buildUrl('/chat/completions'), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config?.model || 'deepseek-chat',
          messages: [
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`DeepSeek ${mode} failed: ${error.message}`);
      }
      throw new Error(`DeepSeek ${mode} failed: Unknown error`);
    }
  }

  /**
   * Stream text processing with SSE support
   */
  async *streamProcess(text: string, mode: 'proofread' | 'polish' | 'expand'): AsyncGenerator<StreamChunk> {
    if (!(await this.checkAvailability())) {
      throw new Error('DeepSeek API is not configured. Please set your API key in settings.');
    }

    const template = PROMPT_TEMPLATES[mode];
    const prompt = template(text);

    try {
      const response = await fetch(this.buildUrl('/chat/completions'), {
        method: 'POST',
        headers: {
          ...this.buildHeaders(),
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: this.config?.model || 'deepseek-chat',
          messages: [
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('DeepSeek streaming response: No response body');
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

            if (!trimmedLine || trimmedLine.startsWith(':')) {
              continue;
            }

            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6);

              if (data === '[DONE]') {
                yield { delta: '', done: true };
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;

                if (delta) {
                  yield { delta, done: false };
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
        throw new Error(`DeepSeek ${mode} streaming failed: ${error.message}`);
      }
      throw new Error(`DeepSeek ${mode} streaming failed: Unknown error`);
    }
  }
}

// Export singleton instance
export const deepSeekAdapter = new DeepSeekAdapter();