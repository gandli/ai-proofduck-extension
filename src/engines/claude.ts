/**
 * Claude Adapter - Anthropic API Format
 * Implements Claude API for translation and text processing
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

export class ClaudeAdapter implements TranslationEngine {
  readonly id = 'claude';
  readonly name = 'Claude';
  readonly category: 'llm' = 'llm';
  readonly priority = 20;

  readonly capabilities = {
    supportedLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru', 'ar', 'hi', 'th', 'vi'],
    maxTextLength: 200000, // Claude supports up to 200k tokens
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
    const apiKeyConfig = settings.getAPIKey('claude');

    if (apiKeyConfig?.apiKey && apiKeyConfig?.enabled) {
      this.config = {
        apiKey: apiKeyConfig.apiKey,
        baseUrl: apiKeyConfig.baseUrl || 'https://api.anthropic.com/v1',
        model: apiKeyConfig.model || 'claude-sonnet-4-20250514',
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
    const baseUrl = this.config?.baseUrl?.replace(/\/$/, '') || 'https://api.anthropic.com/v1';
    return `${baseUrl}${path}`;
  }

  /**
   * Build headers for API request (Anthropic format)
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': `${this.config?.apiKey}`,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  /**
   * Translate text using Claude API
   */
  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    if (!(await this.checkAvailability())) {
      throw new Error('Claude API is not configured. Please set your API key in settings.');
    }

    const prompt = PROMPT_TEMPLATES.translate(text, from, to);
    const startTime = Date.now();

    try {
      const response = await fetch(this.buildUrl('/messages'), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config?.model || 'claude-sonnet-4-20250514',
          messages: [
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const translatedText = data.content?.[0]?.text?.trim() || '';

      return {
        translatedText,
        engine: this.id,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude translation failed: ${error.message}`);
      }
      throw new Error('Claude translation failed: Unknown error');
    }
  }

  /**
   * Stream translation using Claude API with SSE
   */
  async *stream(text: string, from: string, to: string): AsyncGenerator<StreamChunk> {
    if (!(await this.checkAvailability())) {
      throw new Error('Claude API is not configured. Please set your API key in settings.');
    }

    const prompt = PROMPT_TEMPLATES.translate(text, from, to);

    try {
      const response = await fetch(this.buildUrl('/messages'), {
        method: 'POST',
        headers: {
          ...this.buildHeaders(),
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: this.config?.model || 'claude-sonnet-4-20250514',
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
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Claude streaming response: No response body');
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

                // Handle Claude streaming events
                if (parsed.type === 'content_block_delta') {
                  const delta = parsed.delta?.text;
                  if (delta) {
                    yield { delta, done: false };
                  }
                } else if (parsed.type === 'message_delta') {
                  yield { delta: '', done: true };
                  return;
                } else if (parsed.type === 'message_stop') {
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
        throw new Error(`Claude streaming failed: ${error.message}`);
      }
      throw new Error('Claude streaming failed: Unknown error');
    }
  }

  /**
   * Process text with the model (for proofread, polish, expand modes)
   */
  async processText(text: string, mode: 'proofread' | 'polish' | 'expand'): Promise<string> {
    if (!(await this.checkAvailability())) {
      throw new Error('Claude API is not configured. Please set your API key in settings.');
    }

    const template = PROMPT_TEMPLATES[mode];
    const prompt = template(text);

    try {
      const response = await fetch(this.buildUrl('/messages'), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config?.model || 'claude-sonnet-4-20250514',
          messages: [
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.content?.[0]?.text?.trim() || '';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude ${mode} failed: ${error.message}`);
      }
      throw new Error(`Claude ${mode} failed: Unknown error`);
    }
  }

  /**
   * Stream text processing with SSE support
   */
  async *streamProcess(text: string, mode: 'proofread' | 'polish' | 'expand'): AsyncGenerator<StreamChunk> {
    if (!(await this.checkAvailability())) {
      throw new Error('Claude API is not configured. Please set your API key in settings.');
    }

    const template = PROMPT_TEMPLATES[mode];
    const prompt = template(text);

    try {
      const response = await fetch(this.buildUrl('/messages'), {
        method: 'POST',
        headers: {
          ...this.buildHeaders(),
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: this.config?.model || 'claude-sonnet-4-20250514',
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
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Claude streaming response: No response body');
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

                if (parsed.type === 'content_block_delta') {
                  const delta = parsed.delta?.text;
                  if (delta) {
                    yield { delta, done: false };
                  }
                } else if (parsed.type === 'message_delta' || parsed.type === 'message_stop') {
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
        throw new Error(`Claude ${mode} streaming failed: ${error.message}`);
      }
      throw new Error(`Claude ${mode} streaming failed: Unknown error`);
    }
  }
}

// Export singleton instance
export const claudeAdapter = new ClaudeAdapter();