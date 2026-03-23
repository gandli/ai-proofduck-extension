import { RUNTIME_MESSAGES, STORAGE_KEYS, type InputDraft, type SelectionTranslationPayload } from './shared/contracts';
import { DEFAULT_SETTINGS } from './shared/contracts';

const OFFSCREEN_PATH = '/offscreen.html';

async function ensureOffscreenDocument() {
  if (!browser.offscreen?.createDocument) {
    throw new Error('当前浏览器不支持隐藏翻译页面');
  }

  try {
    await browser.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ['WORKERS'],
      justification: '在不打开侧边栏的情况下执行本地与浏览器 AI 翻译',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Only a single offscreen document may be created')) {
      throw error;
    }
  }
}

async function translateSelectionWithOffscreen(text: string) {
  await ensureOffscreenDocument();

  const settings = await getSettings();
  const response = await browser.runtime.sendMessage({
    type: RUNTIME_MESSAGES.offscreenTranslate,
    payload: {
      text,
      settings,
    },
    target: 'offscreen',
  });

  if (!response?.ok) {
    throw new Error(response?.error ?? '隐藏翻译页面未返回结果');
  }

  return response;
}

async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('Active tab not found');
  }

  return tab;
}

async function saveDraft(draft: InputDraft) {
  await browser.storage.local.set({ [STORAGE_KEYS.inputDraft]: draft });
}

async function saveSelectionTranslation(payload: SelectionTranslationPayload) {
  await browser.storage.local.set({ [STORAGE_KEYS.selectionTranslation]: payload });
}

async function getSettings() {
  const result = await browser.storage.local.get(STORAGE_KEYS.settings);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[STORAGE_KEYS.settings] as Partial<typeof DEFAULT_SETTINGS> | undefined),
  };
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('[Background] Failed to enable side panel:', error));
  });

  browser.runtime.onMessage.addListener((message, sender) => {
    if (message?.target === 'offscreen') {
      return undefined;
    }

    if (message?.type === RUNTIME_MESSAGES.queueDraft) {
      return saveDraft(message.payload as InputDraft).then(async () => {
        const tabId = sender.tab?.id;
        const windowId = sender.tab?.windowId;

        if (tabId) {
          await browser.sidePanel.open({ tabId });
          return { ok: true };
        }

        if (windowId) {
          await browser.sidePanel.open({ windowId });
          return { ok: true };
        }

        return { ok: true };
      });
    }

    if (message?.type === RUNTIME_MESSAGES.getSelection || message?.type === RUNTIME_MESSAGES.getPageText) {
      return getActiveTab().then((tab) =>
        browser.tabs.sendMessage(tab.id!, {
          type: message.type,
        }),
      );
    }

    if (message?.type === RUNTIME_MESSAGES.translateSelection) {
      return translateSelectionWithOffscreen(String(message.payload?.text ?? ''));
    }

    if (message?.type === RUNTIME_MESSAGES.syncSelectionTranslation) {
      return saveSelectionTranslation(message.payload as SelectionTranslationPayload).then(async () => {
        try {
          await browser.runtime.sendMessage({
            type: RUNTIME_MESSAGES.selectionTranslationUpdated,
            payload: message.payload,
          });
        } catch {
          // Sidepanel may be closed; cache in storage is enough.
        }

        return { ok: true };
      });
    }

    return undefined;
  });
});
