/**
 * Google Translate Adapter
 * 免费翻译引擎，作为兜底方案
 * 支持流式输出
 */

import type { TranslationEngine, TranslationResult, StreamChunk } from '@/types';

export class GoogleTranslateAdapter implements TranslationEngine {
  readonly id = 'google';
  readonly name = 'Google Translate';
  readonly category: 'translation' = 'translation';
  readonly priority = 5; // 低于 LLM 引擎

  readonly capabilities = {
    supportedLanguages: [
      'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru',
      'ar', 'hi', 'th', 'vi', 'id', 'ms', 'tr', 'pl', 'nl', 'el',
      'cs', 'sv', 'da', 'fi', 'no', 'uk', 'he', 'ro', 'hu', 'bg',
    ],
    maxTextLength: 5000,
  };

  // Google Translate API 端点 (免费版使用)
  private readonly API_URL = 'https://translate.googleapis.com/translate_a/single';

  /**
   * 检测引擎是否可用
   */
  async checkAvailability(): Promise<boolean> {
    // Google Translate 始终可用（作为兜底方案）
    return true;
  }

  /**
   * 翻译文本
   */
  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    const startTime = Date.now();

    try {
      const result = await this.fetchTranslation(text, from, to);

      return {
        translatedText: result,
        engine: this.id,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google Translate failed: ${error.message}`);
      }
      throw new Error('Google Translate failed: Unknown error');
    }
  }

  /**
   * 流式翻译
   */
  async *stream(text: string, from: string, to: string): AsyncGenerator<StreamChunk> {
    try {
      const translatedText = await this.fetchTranslation(text, from, to);

      // 模拟流式输出，每次返回一小段
      const chunkSize = 20;
      for (let i = 0; i < translatedText.length; i += chunkSize) {
        yield {
          delta: translatedText.slice(i, i + chunkSize),
          done: false,
        };
        // 添加小延迟以模拟流式效果
        await this.sleep(10);
      }
      yield { delta: '', done: true };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google Translate stream failed: ${error.message}`);
      }
      throw new Error('Google Translate stream failed: Unknown error');
    }
  }

  /**
   * 调用 Google Translate API
   */
  private async fetchTranslation(text: string, from: string, to: string): Promise<string> {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: from,
      tl: to,
      dt: 't',
      q: text,
    });

    const response = await fetch(`${this.API_URL}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid response format from Google Translate');
    }

    // 解析响应数据
    // Google Translate API 返回格式: [[translations], original_text, ...]
    const translations = data[0] as ArrayProp;
    if (!Array.isArray(translations)) {
      throw new Error('Invalid translation data format');
    }

    // 合并所有翻译片段
    const translatedText = translations
      .map((item) => (Array.isArray(item) ? item[0] : item))
      .filter((text): text is string => typeof text === 'string')
      .join('');

    return translatedText;
  }

  /**
   * 辅助函数：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出单例
export const googleTranslateAdapter = new GoogleTranslateAdapter();

// 类型定义用于内部使用
type ArrayProp = Array<unknown>;