/**
 * Message Handler - 消息处理工具
 * 处理内容脚本与后台脚本之间的消息通信
 */

import type { ContentToBackgroundMessage, BackgroundToContentMessage } from '@/types/content';
import type { TranslationResult, ProofreadResult } from '@/types';

/**
 * 发送消息到后台脚本
 * @param message 要发送的消息
 * @returns 响应数据
 */
export async function sendToBackground<T = unknown>(
  message: ContentToBackgroundMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(message, (response) => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

/**
 * 请求翻译
 * @param text 要翻译的文本
 * @param _from 源语言 (预留)
 * @param _to 目标语言 (预留)
 * @returns 翻译结果
 */
export async function requestTranslation(
  text: string,
  _from = 'auto',
  _to = 'zh'
): Promise<string> {
  const response = await sendToBackground<BackgroundToContentMessage>({
    type: 'translate',
    text,
    mode: 'translate',
  });

  if (response.type === 'error') {
    throw new Error(response.error || 'Translation failed');
  }

  const result = response.result as TranslationResult;
  return result.translatedText;
}

/**
 * 请求校对
 * @param text 要校对的文本
 * @returns 校对结果
 */
export async function requestProofread(text: string): Promise<string> {
  const response = await sendToBackground<BackgroundToContentMessage>({
    type: 'proofread',
    text,
    mode: 'proofread',
  });

  if (response.type === 'error') {
    throw new Error(response.error || 'Proofread failed');
  }

  // ProofreadResult 包含 correctedText
  const result = response.result as ProofreadResult;
  return result.correctedText;
}

/**
 * 请求润色
 * @param text 要润色的文本
 * @returns 润色结果
 */
export async function requestPolish(text: string): Promise<string> {
  const response = await sendToBackground<BackgroundToContentMessage>({
    type: 'polish',
    text,
    mode: 'polish',
  });

  if (response.type === 'error') {
    throw new Error(response.error || 'Polish failed');
  }

  const result = response.result as ProofreadResult;
  return result.correctedText;
}

/**
 * 请求扩展
 * @param text 要扩展的文本
 * @returns 扩展结果
 */
export async function requestExpand(text: string): Promise<string> {
  const response = await sendToBackground<BackgroundToContentMessage>({
    type: 'expand',
    text,
    mode: 'expand',
  });

  if (response.type === 'error') {
    throw new Error(response.error || 'Expand failed');
  }

  const result = response.result as ProofreadResult;
  return result.correctedText;
}
