import { RUNTIME_MESSAGES, STORAGE_KEYS, type InputDraft, type SelectionTranslationPayload } from './shared/contracts';
import { DEFAULT_SETTINGS } from './shared/contracts';

const OFFSCREEN_PATH = '/offscreen.html';
const OFFSCREEN_PORT = 'proofduck-offscreen-port';
const OFFSCREEN_EXECUTE = 'proofduck:offscreen-translation-execute';
const OFFSCREEN_RESULT = 'proofduck:offscreen-translation-result';
const OFFSCREEN_READY = 'proofduck:offscreen-ready';

let offscreenPort: chrome.runtime.Port | null = null;
let offscreenReady = false;
const pendingOffscreenRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

async function ensureOffscreenDocument() {
  if (!browser.offscreen?.createDocument) {
    throw new Error('当前浏览器不支持隐藏翻译页面');
  }

  try {
    await browser.offscreen.createDocument({
      url: browser.runtime.getURL(OFFSCREEN_PATH),
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

async function forwardOffscreenTranslation(payload: { text: string; settings: typeof DEFAULT_SETTINGS }) {
  await ensureOffscreenDocument();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (offscreenPort && offscreenReady) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  if (!offscreenPort || !offscreenReady) {
    throw new Error('隐藏翻译页暂时没有响应');
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const activePort = offscreenPort;
  if (!activePort) {
    throw new Error('隐藏翻译页暂时没有响应');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingOffscreenRequests.delete(requestId);
      reject(new Error('隐藏翻译页暂时没有响应'));
    }, 7000);

    pendingOffscreenRequests.set(requestId, {
      resolve,
      reject,
      timeout,
    });

    activePort.postMessage({
      type: OFFSCREEN_EXECUTE,
      id: requestId,
      payload,
    });
  });
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
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== OFFSCREEN_PORT) {
      return;
    }

    offscreenPort = port;
    offscreenReady = false;
    port.onMessage.addListener((message) => {
      const payloadMessage = message as {
        type?: string;
        id?: string;
        payload?: unknown;
      };

      if (payloadMessage.type === OFFSCREEN_READY) {
        offscreenReady = true;
        return;
      }

      if (payloadMessage.type !== OFFSCREEN_RESULT || !payloadMessage.id) {
        return;
      }

      const pending = pendingOffscreenRequests.get(payloadMessage.id);
      if (!pending) {
        return;
      }

      clearTimeout(pending.timeout);
      pendingOffscreenRequests.delete(payloadMessage.id);
      pending.resolve(payloadMessage.payload);
    });

    port.onDisconnect.addListener(() => {
      if (offscreenPort === port) {
        offscreenPort = null;
        offscreenReady = false;
      }

      for (const [requestId, pending] of pendingOffscreenRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('隐藏翻译页连接已断开'));
        pendingOffscreenRequests.delete(requestId);
      }
    });
  });

  browser.runtime.onInstalled.addListener(() => {
    browser.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('[Background] Failed to enable side panel:', error));
  });

  browser.runtime.onMessage.addListener((message, sender) => {
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

    if (message?.type === RUNTIME_MESSAGES.ensureOffscreenHost) {
      return ensureOffscreenDocument().then(() => ({ ok: true }));
    }

    if (message?.type === RUNTIME_MESSAGES.offscreenTranslate) {
      return forwardOffscreenTranslation(message.payload as { text: string; settings: typeof DEFAULT_SETTINGS });
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
