/**
 * Background Service Worker
 * 负责右键菜单注册、消息转发、翻译引擎调用
 */

import { t } from '../src/i18n';
import type { ContentToBackgroundMessage, AIMode } from '../src/types';

// 右键菜单 ID 常量
const MENU_IDS = {
  TRANSLATE_PAGE: 'proofduck-translate-page',
  TRANSLATE_SELECTION: 'proofduck-translate-selection',
  PROOFREAD_SELECTION: 'proofduck-proofread-selection',
  POLISH_SELECTION: 'proofduck-polish-selection',
  EXPAND_SELECTION: 'proofduck-expand-selection',
} as const;

/**
 * 创建右键菜单
 */
function createContextMenus(): void {
  // 清除已有菜单（避免重复）
  browser.contextMenus.removeAll().then(() => {
    // 创建父菜单 - ProofDuck
    browser.contextMenus.create({
      id: 'proofduck-parent',
      title: '🦆 ProofDuck',
      contexts: ['all'],
    });

    // 翻译页面
    browser.contextMenus.create({
      id: MENU_IDS.TRANSLATE_PAGE,
      parentId: 'proofduck-parent',
      title: t('menuTranslatePage') || '翻译页面',
      contexts: ['page'],
    });

    // 分隔线
    browser.contextMenus.create({
      id: 'proofduck-separator',
      parentId: 'proofduck-parent',
      type: 'separator',
      contexts: ['selection'],
    });

    // 翻译选中文字
    browser.contextMenus.create({
      id: MENU_IDS.TRANSLATE_SELECTION,
      parentId: 'proofduck-parent',
      title: '🌐 ' + (t('menuTranslateSelection') || '翻译选中文字'),
      contexts: ['selection'],
    });

    // 校对选中文字
    browser.contextMenus.create({
      id: MENU_IDS.PROOFREAD_SELECTION,
      parentId: 'proofduck-parent',
      title: '✨ ' + (t('menuProofreadSelection') || '校对选中文字'),
      contexts: ['selection'],
    });

    // 润色选中文字
    browser.contextMenus.create({
      id: MENU_IDS.POLISH_SELECTION,
      parentId: 'proofduck-parent',
      title: '💎 ' + (t('menuPolishSelection') || '润色选中文字'),
      contexts: ['selection'],
    });

    // 扩写选中文字
    browser.contextMenus.create({
      id: MENU_IDS.EXPAND_SELECTION,
      parentId: 'proofduck-parent',
      title: '📝 ' + (t('menuExpandSelection') || '扩写选中文字'),
      contexts: ['selection'],
    });

    console.log('[ProofDuck] 右键菜单已创建');
  });
}

/**
 * 处理右键菜单点击
 * @param info 菜单信息
 * @param tab 当前标签页
 */
async function handleMenuClick(
  info: unknown,
  tab: unknown
): Promise<void> {
  const tabObj = tab as { id?: number };
  const infoObj = info as { menuItemId?: string; selectionText?: string };

  if (!tabObj?.id) {
    console.error('[ProofDuck] 无法获取标签页信息');
    return;
  }

  const menuId = infoObj.menuItemId as string;
  const selectionText = infoObj.selectionText?.trim() || '';

  console.log('[ProofDuck] 菜单点击:', menuId, `length: ${selectionText.length}`);

  try {
    switch (menuId) {
      case MENU_IDS.TRANSLATE_PAGE:
        // 翻译整个页面
        await browser.tabs.sendMessage(tabObj.id!, {
          type: 'translatePage',
        });
        break;

      case MENU_IDS.TRANSLATE_SELECTION:
        if (selectionText) {
          await browser.tabs.sendMessage(tabObj.id!, {
            type: 'translate',
            text: selectionText,
            mode: 'translate' as AIMode,
          });
        }
        break;

      case MENU_IDS.PROOFREAD_SELECTION:
        if (selectionText) {
          await browser.tabs.sendMessage(tabObj.id!, {
            type: 'proofread',
            text: selectionText,
            mode: 'proofread' as AIMode,
          });
        }
        break;

      case MENU_IDS.POLISH_SELECTION:
        if (selectionText) {
          await browser.tabs.sendMessage(tabObj.id!, {
            type: 'polish',
            text: selectionText,
            mode: 'polish' as AIMode,
          });
        }
        break;

      case MENU_IDS.EXPAND_SELECTION:
        if (selectionText) {
          await browser.tabs.sendMessage(tabObj.id!, {
            type: 'expand',
            text: selectionText,
            mode: 'expand' as AIMode,
          });
        }
        break;
    }
  } catch (error) {
    console.error('[ProofDuck] 发送消息失败:', error);
  }
}

/**
 * 处理来自内容脚本的消息
 * @param message 消息
 * @param sender 发送者
 * @returns 响应
 */
async function handleMessage(
  message: ContentToBackgroundMessage,
  _sender: unknown
): Promise<unknown> {
  console.log('[ProofDuck] 收到消息:', message.type, `length: ${message.text?.length || 0}`);

  // TODO: 调用翻译引擎处理
  // 目前只是返回测试结果
  return {
    type: 'translationResult',
    originalText: message.text,
    result: {
      translatedText: `[测试] ${message.text}`,
      engine: 'test-engine',
    },
  };
}

export default defineBackground(() => {
  console.log(t('backgroundHello'), { id: browser.runtime.id });

  // 创建右键菜单
  createContextMenus();

  // 监听右键菜单点击
  browser.contextMenus.onClicked.addListener(handleMenuClick);

  // 监听来自内容脚本的消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((error) => {
        console.error('[ProofDuck] 消息处理失败:', error);
        sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
      });
    return true; // 保持消息通道开放
  });

  console.log('[ProofDuck] Background Service Worker 已初始化');
});
