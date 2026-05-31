/**
 * 全文翻译工具
 * 遍历页面文本节点，调用翻译引擎，在原文下方插入译文（双语对照模式）
 */

import { extractTextNodes, filterShortNodes, detectPageLanguage, type TextNodeInfo } from './pageContentExtractor';
import type { TranslationResult } from '../types';

/**
 * 翻译进度回调
 */
export type ProgressCallback = (current: number, total: number, translatedText: string) => void;

/**
 * 翻译选项
 */
export interface TranslatePageOptions {
  /** 源语言，auto 表示自动检测 */
  sourceLang?: string;
  /** 目标语言 */
  targetLang: string;
  /** 是否启用双语对照模式 */
  bilingualMode?: boolean;
  /** 是否显示原文 */
  showOriginal?: boolean;
  /** 进度回调 */
  onProgress?: ProgressCallback;
  /** 翻译函数 */
  translateFn: (text: string, from: string, to: string) => Promise<TranslationResult>;
}

/**
 * 翻译后的文本节点信息
 */
interface TranslatedNode {
  originalNode: TextNodeInfo;
  translatedText: string;
  translationResult: TranslationResult;
}

/**
 * 全局样式注入标记
 */
const STYLE_MARKER = 'proofduck-bilingual-style';

/**
 * 注入双语对照样式
 */
function injectBilingualStyles(): void {
  if (document.getElementById(STYLE_MARKER)) {
    return; // 已注入
  }

  const style = document.createElement('style');
  style.id = STYLE_MARKER;
  style.textContent = `
    .proofduck-translated-block {
      border-left: 3px solid #FF5A11;
      padding-left: 16px;
      margin: 8px 0;
      color: #333;
      line-height: 1.8;
    }
    .proofduck-original-block {
      color: #999;
      font-size: 0.9em;
      border-left: 2px solid #ddd;
      padding-left: 12px;
      margin: 4px 0 8px 0;
    }
    .proofduck-translation-container {
      background-color: #fff;
      padding: 16px;
      margin: 16px 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .proofduck-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background-color: #FF5A11;
      z-index: 2147483647;
      transition: width 0.3s ease;
    }
    .proofduck-translated-block:hover,
    .proofduck-original-block:hover {
      background-color: #f9f9f9;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 移除双语对照样式
 */
function removeBilingualStyles(): void {
  const style = document.getElementById(STYLE_MARKER);
  if (style) {
    style.remove();
  }
}

/**
 * 创建双语对照翻译块
 * @param originalText 原文
 * @param translatedText 译文
 * @param bilingualMode 是否双语对照
 * @returns HTML 元素
 */
function createTranslationBlock(
  originalText: string,
  translatedText: string,
  bilingualMode: boolean
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'proofduck-translation-container';

  if (bilingualMode) {
    // 显示原文（灰色）
    const originalBlock = document.createElement('div');
    originalBlock.className = 'proofduck-original-block';
    originalBlock.textContent = originalText;
    container.appendChild(originalBlock);

    // 显示译文（主色边框）
    const translatedBlock = document.createElement('div');
    translatedBlock.className = 'proofduck-translated-block';
    translatedBlock.textContent = translatedText;
    container.appendChild(translatedBlock);
  } else {
    // 只显示译文
    const translatedBlock = document.createElement('div');
    translatedBlock.className = 'proofduck-translated-block';
    translatedBlock.textContent = translatedText;
    container.appendChild(translatedBlock);
  }

  return container;
}

/**
 * 在文本节点后插入翻译块
 * @param nodeInfo 文本节点信息
 * @param translatedText 译文
 * @param bilingualMode 是否双语对照
 */
function insertTranslationAfter(
  nodeInfo: TextNodeInfo,
  translatedText: string,
  bilingualMode: boolean
): void {
  const { node, text } = nodeInfo;
  const parent = node.parentElement;
  if (!parent) return;

  // 创建翻译块
  const block = createTranslationBlock(text, translatedText, bilingualMode);

  // 找到正确的插入位置
  let insertAfterNode: Node | null = node;

  // 如果节点后面还有同父元素的文本节点，继续往后找
  while (insertAfterNode?.nextSibling) {
    const next: Node = insertAfterNode.nextSibling;
    if (next.nodeType === Node.ELEMENT_NODE) {
      const tagName = (next as Element).tagName?.toUpperCase();
      // 如果遇到块级元素，在它前面插入
      if (['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TR', 'BR'].includes(tagName)) {
        parent.insertBefore(block, next);
        return;
      }
    }
    insertAfterNode = next;
  }

  // 默认在末尾插入
  parent.appendChild(block);
}

/**
 * 执行全文翻译
 * @param options 翻译选项
 * @returns 翻译结果数组
 */
export async function translateFullPage(options: TranslatePageOptions): Promise<TranslatedNode[]> {
  const {
    sourceLang = 'auto',
    targetLang,
    bilingualMode = true,
    showOriginal = true,
    onProgress,
    translateFn,
  } = options;

  // 注入样式
  injectBilingualStyles();

  // 提取并过滤文本节点
  const textNodes = extractTextNodes();
  const filteredNodes = filterShortNodes(textNodes, 20);

  const results: TranslatedNode[] = [];
  const total = filteredNodes.length;
  let current = 0;

  // 创建进度条
  const progressBar = document.createElement('div');
  progressBar.className = 'proofduck-progress-bar';
  progressBar.style.width = '0%';
  document.body.appendChild(progressBar);

  try {
    for (const nodeInfo of filteredNodes) {
      current++;

      // 调用翻译
      const langFrom = sourceLang === 'auto' ? detectPageLanguage() : sourceLang;
      const translationResult = await translateFn(nodeInfo.text, langFrom, targetLang);

      // 插入翻译块
      insertTranslationAfter(nodeInfo, translationResult.translatedText, bilingualMode && showOriginal);

      results.push({
        originalNode: nodeInfo,
        translatedText: translationResult.translatedText,
        translationResult,
      });

      // 更新进度
      if (onProgress) {
        onProgress(current, total, translationResult.translatedText);
      }

      // 更新进度条
      progressBar.style.width = `${(current / total) * 100}%`;

      // 添加延迟避免请求过快
      if (current < total) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  } finally {
    // 移除进度条
    setTimeout(() => {
      progressBar.remove();
    }, 1000);
  }
}

/**
 * 清除页面上的翻译结果
 */
export function clearPageTranslations(): void {
  // 移除所有翻译容器
  const containers = document.querySelectorAll('.proofduck-translation-container');
  containers.forEach((container) => container.remove());

  // 移除样式
  removeBilingualStyles();
}

/**
 * 获取页面翻译状态
 */
export function getPageTranslationStatus(): {
  hasTranslations: boolean;
  translationCount: number;
} {
  const containers = document.querySelectorAll('.proofduck-translation-container');
  return {
    hasTranslations: containers.length > 0,
    translationCount: containers.length,
  };
}

/**
 * 翻译文本节点批次（用于分段翻译）
 * @param nodes 文本节点数组
 * @param from 源语言
 * @param to 目标语言
 * @param translateFn 翻译函数
 * @param batchSize 每批大小
 * @param onProgress 进度回调
 */
export async function translateNodeBatch(
  nodes: TextNodeInfo[],
  from: string,
  to: string,
  translateFn: (text: string, from: string, to: string) => Promise<TranslationResult>,
  batchSize = 10,
  onProgress?: ProgressCallback
): Promise<Array<{ node: TextNodeInfo; result: TranslationResult }>> {
  const results: Array<{ node: TextNodeInfo; result: TranslationResult }> = [];

  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);

    // 并行翻译这一批
    const batchResults = await Promise.all(
      batch.map(async (node) => {
        const result = await translateFn(node.text, from, to);
        return { node, result };
      })
    );

    results.push(...batchResults);

    // 报告进度
    if (onProgress) {
      onProgress(i + batch.length, nodes.length, batchResults[0]?.result.translatedText || '');
    }

    // 批次间隔
    if (i + batchSize < nodes.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
