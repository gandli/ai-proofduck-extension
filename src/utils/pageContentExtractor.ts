/**
 * 页面内容提取工具
 * DOM 文本节点遍历，过滤非内容节点，页面语言检测
 */

/**
 * 需要过滤的标签
 */
const IGNORED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'IMG',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON',
  'HEAD',
  'TITLE',
  'META',
  'LINK',
  'BASE',
  'MODIFIER',
]);

/**
 * 文本节点信息
 */
export interface TextNodeInfo {
  node: Text;
  text: string;
  parentTag: string;
  rect: DOMRect;
}

/**
 * 提取页面所有文本节点
 * @param root 可选的根节点，默认为 document.body
 * @returns 文本节点信息数组
 */
export function extractTextNodes(root: ParentNode = document.body): TextNodeInfo[] {
  const textNodes: TextNodeInfo[] = [];

  // Cache for DOM measurements to prevent layout thrashing
  const styleCache = new WeakMap<Element, CSSStyleDeclaration>();
  const rectCache = new WeakMap<Element, DOMRect>();

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Node) => {
        // 跳过空白文本节点
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        // 获取父元素标签
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }

        const tagName = parent.tagName.toUpperCase();

        // 跳过需要忽略的标签
        if (IGNORED_TAGS.has(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // 跳过 hidden 元素
        if (parent.hidden) {
          return NodeFilter.FILTER_REJECT;
        }

        // 跳过 display: none 或 visibility: hidden 的元素
        let style = styleCache.get(parent);
        if (!style) {
          style = window.getComputedStyle(parent);
          styleCache.set(parent, style);
        }
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement!;

    let rect = rectCache.get(parent);
    if (!rect) {
      rect = parent.getBoundingClientRect();
      rectCache.set(parent, rect);
    }

    // 跳过尺寸为 0 的元素
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }

    textNodes.push({
      node,
      text: node.textContent || '',
      parentTag: parent.tagName.toLowerCase(),
      rect,
    });
  }

  return textNodes;
}

/**
 * 页面语言检测结果
 */
export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  languages: Array<{ language: string; confidence: number }>;
}

/**
 * 检测页面语言
 * 使用 navigator.language 和 Content-Language Meta 标签
 * @returns 语言代码，如 'en', 'zh', 'ja'
 */
export function detectPageLanguage(): string {
  // 1. 检查 HTML lang 属性
  const htmlLang = document.documentElement.lang;
  if (htmlLang && htmlLang.length >= 2) {
    const langPart = htmlLang.split('-')[0];
    return langPart ? langPart.toLowerCase() : 'en';
  }

  // 2. 检查 Content-Language Meta 标签
  const contentLanguageMeta = document.querySelector('meta[http-equiv="content-language"]');
  if (contentLanguageMeta) {
    const content = contentLanguageMeta.getAttribute('content');
    if (content) {
      const langPart = content.split('-')[0];
      return langPart ? langPart.toLowerCase() : 'en';
    }
  }

  // 3. 检查 charset Meta 标签（间接判断）
  const charsetMeta = document.querySelector('meta[charset]');
  const charset = charsetMeta?.getAttribute('charset')?.toLowerCase();
  if (charset) {
    // 简单的字符集到语言的映射
    if (charset.includes('gb') || charset.includes('shift_jis') || charset.includes('euc-jp')) {
      if (charset.includes('gb')) return 'zh';
      if (charset.includes('jis') || charset.includes('shift') || charset.includes('euc-jp')) return 'ja';
    }
  }

  // 4. 使用 navigator.language
  const navLang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage;
  if (navLang) {
    const langPart = navLang.split('-')[0];
    return langPart ? langPart.toLowerCase() : 'en';
  }

  // 默认返回 'en'
  return 'en';
}

/**
 * 提取页面主要内容
 * 尝试找到主要内容区域（article, main, content 等）
 * @returns 主要内容文本
 */
export function extractMainContent(): string {
  // 尝试常见的主要内容容器
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.article-content',
    '.entry-content',
    '#content',
    '#main-content',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && text.length > 100) {
        return text;
      }
    }
  }

  // 如果没找到主要内容容器，返回 body 的文本
  return document.body.textContent?.trim() || '';
}

/**
 * 过滤短文本节点（可能是 UI 元素）
 * @param nodes 文本节点数组
 * @param minLength 最小文本长度
 * @returns 过滤后的文本节点
 */
export function filterShortNodes(nodes: TextNodeInfo[], minLength = 20): TextNodeInfo[] {
  return nodes.filter((info) => info.text.trim().length >= minLength);
}

/**
 * 获取文本节点在页面中的位置信息
 * @param node 文本节点
 * @returns 位置信息
 */
export function getTextPosition(node: Text): { x: number; y: number; width: number; height: number } | null {
  const range = document.createRange();
  range.selectNodeContents(node);

  try {
    const rects = range.getClientRects();
    if (rects.length === 0) {
      // 回退到父元素
      const parentRect = node.parentElement?.getBoundingClientRect();
      if (!parentRect) return null;
      return {
        x: parentRect.left + window.scrollX,
        y: parentRect.top + window.scrollY,
        width: parentRect.width,
        height: parentRect.height,
      };
    }

    const rect = rects[0];
    if (!rect) return null;
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  } catch {
    return null;
  }
}
