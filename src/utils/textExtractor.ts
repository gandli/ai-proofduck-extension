/**
 * Text Extractor - 文本提取工具
 * 用于从网页中提取用户选择的文本及其位置信息
 */

import type { SelectionInfo, TextPosition } from '../types/content';

/**
 * 获取当前选区信息
 * @returns 选区信息，如果无选区则返回 null
 */
export function getSelectionInfo(): SelectionInfo | null {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();

  if (!text) {
    return null;
  }

  return {
    text,
    startOffset: 0,
    endOffset: text.length,
    context: getSelectionContext(range),
  };
}

/**
 * 获取选区周围的上下文文本
 */
function getSelectionContext(range: Range): string {
  const container = range.commonAncestorContainer;
  const element = container.nodeType === Node.TEXT_NODE
    ? container.parentElement
    : container as Element;

  if (!element) {
    return '';
  }

  // 获取周围的部分文本作为上下文
  const fullText = element.textContent || '';
  const selectedText = range.toString();

  const startIndex = fullText.indexOf(selectedText);
  if (startIndex === -1) {
    return '';
  }

  // 提取选区前后的一些字符作为上下文
  const contextBefore = fullText.slice(Math.max(0, startIndex - 50), startIndex);
  const contextAfter = fullText.slice(
    startIndex + selectedText.length,
    startIndex + selectedText.length + 50
  );

  return `${contextBefore}[${selectedText}]${contextAfter}`;
}

/**
 * 查找文本在页面中的位置
 * @param _text 要查找的文本（预留）
 * @returns 文本位置信息，如果找不到则返回 null
 */
export function findTextPosition(_text: string): TextPosition | null {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * 提取页面内容
 * 从网页中提取可翻译的文本内容
 */
export function extractPageContent(): string {
  const body = document.body;
  if (!body) {
    return '';
  }

  // 移除脚本、样式和隐藏元素
  const clone = body.cloneNode(true) as HTMLElement;

  const removeElements = clone.querySelectorAll('script, style, noscript, iframe, nav, footer, header');
  removeElements.forEach(el => el.remove());

  // 获取纯文本
  return clone.textContent?.trim() || '';
}
