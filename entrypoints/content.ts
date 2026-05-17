/**
 * Content Script 主入口
 * 负责与网页交互：划词监听、内容提取、结果展示
 */

import { t } from '../src/i18n';
import { TranslationCache } from '../src/utils/cache';

// 懒加载标记
let popupModuleLoaded = false;

// 缓存实例
const translationCache = new TranslationCache();

// 当前显示的 Popup 根元素
let currentPopupRoot: HTMLDivElement | null = null;

/**
 * 关闭当前浮层
 */
function closeCurrentPopup(): void {
  if (currentPopupRoot) {
    currentPopupRoot.remove();
    currentPopupRoot = null;
  }
}

/**
 * 获取选区文本
 */
function getSelectedText(): string {
  const selection = window.getSelection();
  return selection?.toString().trim() || '';
}

/**
 * 显示结果浮层（懒加载 React 组件）
 */
async function showResultPopup(
  originalText: string,
  resultText: string
): Promise<void> {
  // 先关闭已有浮层
  closeCurrentPopup();

  // 获取选区位置
  const selection = window.getSelection();
  let position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  if (selection && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    position = {
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.bottom + window.scrollY + 10,
    };
  }

  // 创建 React 挂载点
  const root = document.createElement('div');
  root.id = 'proofduck-popup-root';
  root.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
  `;
  document.body.appendChild(root);
  currentPopupRoot = root;

  // 懒加载 React 组件（仅在需要时加载）
  if (!popupModuleLoaded) {
    popupModuleLoaded = true;
    // 预加载 React 和 ReactDOM（后台静默预加载）
    import('react').catch(() => {});
    import('react-dom/client').catch(() => {});
  }

  // 动态导入 ResultPopup 组件
  try {
    const { ResultPopup } = await import('../src/components/ResultPopup');
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');

    const popupRoot = ReactDOM.createRoot(root);
    popupRoot.render(
      React.createElement(ResultPopup, {
        originalText,
        resultText,
        position,
        onClose: closeCurrentPopup,
        onCopy: (text: string) => navigator.clipboard.writeText(text),
      })
    );
  } catch (error) {
    console.error('[ProofDuck] 加载 Popup 组件失败:', error);
    root.remove();
    currentPopupRoot = null;
  }
}

/**
 * 处理翻译请求（带缓存）
 */
async function handleTranslation(text: string): Promise<void> {
  // 检查缓存
  const cachedResult = translationCache.get(text, 'translate');
  if (cachedResult) {
    console.log('[ProofDuck] 使用缓存结果');
    await showResultPopup(text, cachedResult);
    return;
  }

  try {
    // 发送翻译请求到后台
    const response = await browser.runtime.sendMessage({
      type: 'translate',
      text,
    });

    // 处理响应
    if (response?.result) {
      // 缓存结果
      translationCache.set(text, 'translate', response.result);
      await showResultPopup(text, response.result);
    } else {
      await showResultPopup(text, `[处理失败] ${response?.error || '未知错误'}`);
    }
  } catch (error) {
    console.error('[ProofDuck] 翻译请求失败:', error);
    await showResultPopup(text, `[处理失败] ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理用户选词事件
 * 当用户选择文本后，触发翻译/校对请求
 */
async function handleSelectionChange(): Promise<void> {
  // 获取选区文本
  const selectedText = getSelectedText();

  // 忽略过短的选区（可能是意外选择）
  if (selectedText.length < 2) {
    return;
  }

  // Prevent logging user-provided text to avoid sensitive data exposure
  console.log('[ProofDuck] 检测到选区, 长度:', selectedText.length);

  // 使用缓存和翻译处理
  await handleTranslation(selectedText);
}

// 防抖计时器
let selectionDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 选区变化事件处理器（带防抖）
 */
function onSelectionChange(): void {
  if (selectionDebounceTimer) {
    clearTimeout(selectionDebounceTimer);
  }

  // 延迟执行，等待选区稳定
  selectionDebounceTimer = setTimeout(() => {
    handleSelectionChange();
  }, 300);
}

/**
 * 注册划词监听
 */
function registerSelectionListener(): void {
  document.addEventListener('mouseup', () => {
    // 延迟检查选区，确保选区已稳定
    setTimeout(onSelectionChange, 100);
  });

  // 监听选区变化（兼容多种浏览器）
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      onSelectionChange();
    }
  });

  console.log('[ProofDuck] 划词监听已注册');
}

/**
 * 处理来自后台的消息
 * @param message 后台发送的消息
 */
function handleBackgroundMessage(message: unknown): void {
  console.log('[ProofDuck] 收到后台消息:', message);
}

/**
 * Content Script 主入口
 */
export default defineContentScript({
  // 全匹配所有网站
  matches: ['*://*/*'],

  // 主入口函数
  main() {
    // 输出加载日志
    console.log(t('contentHello') || 'Content script loaded');
    console.log('[ProofDuck] Content Script 已初始化');

    // 注册划词监听
    registerSelectionListener();

    // 监听来自后台的消息
    browser.runtime.onMessage.addListener((message) => {
      handleBackgroundMessage(message);
      return true;
    });

    // 页面卸载时清理
    window.addEventListener('unload', () => {
      closeCurrentPopup();
    });
  },
});
