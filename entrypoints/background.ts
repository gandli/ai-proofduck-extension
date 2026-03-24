import { RUNTIME_MESSAGES, STORAGE_KEYS, type InputDraft, type SelectionTranslationPayload } from './shared/contracts';
import { DEFAULT_SETTINGS } from './shared/contracts';
import { getEngineAttemptOrder } from '../lib/processing/engine-orchestrator';
import { getInlineTranslationTimeoutMs } from '../lib/processing/inline-translation';
import { readStoredTestEngineOverride } from '../lib/processing/test-engine-override';

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

function resetOffscreenConnectionState() {
  offscreenPort = null;
  offscreenReady = false;
}

async function hasOffscreenDocument() {
  if (!browser.runtime?.getContexts) {
    return false;
  }

  const contexts = await browser.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [browser.runtime.getURL(OFFSCREEN_PATH)],
  });

  return contexts.length > 0;
}

async function recreateOffscreenDocument() {
  resetOffscreenConnectionState();

  if (browser.offscreen?.closeDocument) {
    try {
      await browser.offscreen.closeDocument();
    } catch {
      // Ignore close failures; createDocument below will decide the real state.
    }
  }

  await ensureOffscreenDocument();
}

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

async function waitForOffscreenReady(timeoutMs = 1600) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (offscreenPort && offscreenReady) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  return Boolean(offscreenPort && offscreenReady);
}

async function ensureOffscreenReady() {
  await ensureOffscreenDocument();

  if (await waitForOffscreenReady()) {
    return;
  }

  const documentExists = await hasOffscreenDocument();
  if (documentExists) {
    await recreateOffscreenDocument();
  } else {
    await ensureOffscreenDocument();
  }

  if (await waitForOffscreenReady(2200)) {
    return;
  }

  throw new Error('隐藏翻译页暂时没有响应，请稍后重试');
}

async function forwardOffscreenTranslation(payload: { text: string; settings: typeof DEFAULT_SETTINGS }) {
  await ensureOffscreenReady();

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const activePort = offscreenPort;
  if (!activePort) {
    throw new Error('隐藏翻译页暂时没有响应，请稍后重试');
  }

  return new Promise((resolve, reject) => {
    const timeoutMs = getInlineTranslationTimeoutMs(payload.settings);
    const timeout = setTimeout(() => {
      pendingOffscreenRequests.delete(requestId);
      resetOffscreenConnectionState();
      reject(new Error('隐藏翻译页暂时没有响应，请稍后重试'));
    }, timeoutMs);

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
        try {
          await browser.runtime.sendMessage({
            type: RUNTIME_MESSAGES.inputDraftUpdated,
            payload: message.payload,
          });
        } catch {
          // Sidepanel may be closed; storage is enough for later restore.
        }

        return { ok: true };
      });
    }

    if (message?.type === RUNTIME_MESSAGES.getSelection || message?.type === RUNTIME_MESSAGES.getPageText) {
      return (async () => {
        if (message.type === RUNTIME_MESSAGES.getSelection) {
          const overrideResult = await browser.storage.local.get(STORAGE_KEYS.testSelectionDraftResponse);
          if (STORAGE_KEYS.testSelectionDraftResponse in overrideResult) {
            return overrideResult[STORAGE_KEYS.testSelectionDraftResponse] as InputDraft | null;
          }
        }

        if (message.type === RUNTIME_MESSAGES.getPageText) {
          const overrideResult = await browser.storage.local.get(STORAGE_KEYS.testPageDraftResponse);
          if (STORAGE_KEYS.testPageDraftResponse in overrideResult) {
            return overrideResult[STORAGE_KEYS.testPageDraftResponse] as InputDraft | null;
          }
        }

        const tab = await getActiveTab();
        return browser.tabs.sendMessage(tab.id!, {
          type: message.type,
        });
      })();
    }

    if (message?.type === RUNTIME_MESSAGES.ensureOffscreenHost) {
      return ensureOffscreenReady().then(() => ({ ok: true }));
    }

    if (message?.type === RUNTIME_MESSAGES.offscreenTranslate) {
      const payload = message.payload as { text: string; settings: typeof DEFAULT_SETTINGS };
      return (async () => {
        const attempts = getEngineAttemptOrder('translate', payload.settings);
        for (const attempt of attempts) {
          const override = await readStoredTestEngineOverride(attempt.engine);
          if (override) {
            return { ok: true, ...override };
          }
        }

        return forwardOffscreenTranslation(payload);
      })();
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
