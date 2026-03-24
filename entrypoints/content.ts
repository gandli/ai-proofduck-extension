import { extractFullPageText, normalizeText } from './content/extractors';
import {
  DEFAULT_SETTINGS,
  RUNTIME_MESSAGES,
  STORAGE_KEYS,
  type InputDraft,
  type SelectionTranslationPayload,
  type Settings,
} from './shared/contracts';
import { toEngineBadge } from './shared/engine-display';
import {
  buildInlineTranslationCacheKey,
  buildInlineTranslationWarmupKey,
  getInlineTranslationTimeoutMs,
  getInlineTranslationUnavailableMessage,
} from '../lib/processing/inline-translation';

const INLINE_TRANSLATION_MAP: Record<string, string> = {
  inference: '推理',
  browser: '浏览器',
  model: '模型',
  text: '文本',
  translation: '翻译',
  engine: '引擎',
  local: '本地',
};

let lastWarmupKey = '';

function getSelectionDraft(): InputDraft | null {
  const selection = window.getSelection();
  const text = normalizeText(selection?.toString() ?? '');

  if (!text) return null;

  return {
    text,
    source: 'selection',
    pageTitle: document.title,
    url: window.location.href,
    capturedAt: new Date().toISOString(),
  };
}

function getPageDraft(): InputDraft | null {
  const text = extractFullPageText(document);
  if (!text) return null;

  return {
    text,
    source: 'page',
    pageTitle: document.title,
    url: window.location.href,
    capturedAt: new Date().toISOString(),
  };
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let currentDraft: InputDraft | null = null;
    let lastSelectionDraft: InputDraft | null = null;
    let hoverHideTimer: number | null = null;
    let hoverTranslateTimer: number | null = null;
    let lastTranslatedKey = '';
    let lastTranslatedText = '';
    let lastTranslatedResult = '';
    let lastTranslatedNotice = '';

    const actionBar = document.createElement('div');
    actionBar.style.position = 'fixed';
    actionBar.style.zIndex = '2147483647';
    actionBar.style.display = 'none';
    actionBar.style.alignItems = 'center';
    actionBar.style.gap = '8px';
    document.documentElement.appendChild(actionBar);

    const sidepanelButton = document.createElement('button');
    sidepanelButton.type = 'button';
    sidepanelButton.textContent = '🐣';
    sidepanelButton.setAttribute('data-proofduck-trigger', 'true');
    sidepanelButton.setAttribute('aria-label', '发送到校对鸭');
    sidepanelButton.style.display = 'flex';
    sidepanelButton.style.alignItems = 'center';
    sidepanelButton.style.justifyContent = 'center';
    sidepanelButton.style.width = '44px';
    sidepanelButton.style.height = '44px';
    sidepanelButton.style.border = 'none';
    sidepanelButton.style.borderRadius = '999px';
    sidepanelButton.style.background = 'transparent';
    sidepanelButton.style.boxShadow = 'none';
    sidepanelButton.style.fontSize = '24px';
    sidepanelButton.style.filter = 'drop-shadow(0 0 8px rgba(255, 192, 65, 0.55)) drop-shadow(0 0 18px rgba(255, 90, 17, 0.18))';
    sidepanelButton.style.textShadow = '0 0 10px rgba(255, 238, 196, 0.95), 0 0 24px rgba(255, 180, 56, 0.42)';
    sidepanelButton.style.cursor = 'pointer';
    actionBar.appendChild(sidepanelButton);

    const popup = document.createElement('div');
    popup.setAttribute('data-proofduck-inline-card', 'true');
    popup.style.position = 'fixed';
    popup.style.zIndex = '2147483647';
    popup.style.display = 'none';
    popup.style.width = 'min(360px, calc(100vw - 20px))';
    popup.style.maxWidth = 'calc(100vw - 24px)';
    popup.style.border = '1px solid rgba(255, 90, 17, 0.14)';
    popup.style.borderRadius = '20px';
    popup.style.background = '#fffdf9';
    popup.style.boxShadow = '0 18px 42px rgba(15, 23, 42, 0.16)';
    popup.style.overflow = 'hidden';
    popup.style.color = '#1f2937';
    popup.style.fontFamily =
      'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    document.documentElement.appendChild(popup);

    const popupHeader = document.createElement('div');
    popupHeader.style.display = 'flex';
    popupHeader.style.alignItems = 'center';
    popupHeader.style.justifyContent = 'space-between';
    popupHeader.style.padding = '12px 14px';
    popupHeader.style.borderBottom = '1px solid rgba(255, 90, 17, 0.12)';
    popup.appendChild(popupHeader);

    const popupStatus = document.createElement('div');
    popupStatus.style.display = 'flex';
    popupStatus.style.alignItems = 'center';
    popupStatus.style.gap = '8px';
    popupHeader.appendChild(popupStatus);

    const popupDot = document.createElement('span');
    popupDot.style.width = '8px';
    popupDot.style.height = '8px';
    popupDot.style.borderRadius = '999px';
    popupDot.style.background = '#f59e0b';
    popupStatus.appendChild(popupDot);

    const popupStatusText = document.createElement('span');
    popupStatusText.textContent = 'TRANSLATING';
    popupStatusText.style.fontSize = '10px';
    popupStatusText.style.fontWeight = '800';
    popupStatusText.style.letterSpacing = '0.08em';
    popupStatusText.style.color = '#d97706';
    popupStatus.appendChild(popupStatusText);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', '关闭翻译弹窗');
    closeButton.style.border = 'none';
    closeButton.style.background = 'transparent';
    closeButton.style.color = '#9ca3af';
    closeButton.style.fontSize = '20px';
    closeButton.style.fontWeight = '700';
    closeButton.style.cursor = 'pointer';
    popupHeader.appendChild(closeButton);

    const popupBody = document.createElement('div');
    popupBody.style.padding = '14px';
    popupBody.style.display = 'grid';
    popupBody.style.gap = '14px';
    popup.appendChild(popupBody);

    const sourceWrap = document.createElement('div');
    popupBody.appendChild(sourceWrap);
    const sourceLabel = document.createElement('div');
    sourceLabel.textContent = 'SOURCE';
    sourceLabel.style.fontSize = '10px';
    sourceLabel.style.fontWeight = '800';
    sourceLabel.style.letterSpacing = '0.08em';
    sourceLabel.style.color = '#98a2b3';
    sourceWrap.appendChild(sourceLabel);
    const sourceText = document.createElement('div');
    sourceText.setAttribute('data-proofduck-inline-source', 'true');
    sourceText.style.marginTop = '8px';
    sourceText.style.paddingLeft = '10px';
    sourceText.style.borderLeft = '3px solid #eceff5';
    sourceText.style.fontSize = '13px';
    sourceText.style.lineHeight = '1.6';
    sourceText.style.fontStyle = 'italic';
    sourceText.style.color = '#667085';
    sourceWrap.appendChild(sourceText);

    const translationWrap = document.createElement('div');
    popupBody.appendChild(translationWrap);
    const translationLabel = document.createElement('div');
    translationLabel.textContent = 'TRANSLATION';
    translationLabel.style.display = 'flex';
    translationLabel.style.alignItems = 'center';
    translationLabel.style.gap = '6px';
    translationLabel.style.fontSize = '10px';
    translationLabel.style.fontWeight = '800';
    translationLabel.style.letterSpacing = '0.08em';
    translationLabel.style.color = '#98a2b3';
    translationWrap.appendChild(translationLabel);

    const engineTag = document.createElement('span');
    engineTag.setAttribute('data-proofduck-inline-engine', 'true');
    engineTag.style.fontSize = '10px';
    engineTag.style.fontWeight = '600';
    engineTag.style.letterSpacing = 'normal';
    engineTag.style.color = '#c45a1a';
    translationLabel.appendChild(engineTag);
    const translationText = document.createElement('div');
    translationText.setAttribute('data-proofduck-inline-result', 'true');
    translationText.style.marginTop = '8px';
    translationText.style.fontSize = '13px';
    translationText.style.lineHeight = '1.6';
    translationText.style.fontWeight = '600';
    translationText.style.color = '#111827';
    translationWrap.appendChild(translationText);

    const popupFooter = document.createElement('div');
    popupFooter.style.display = 'flex';
    popupFooter.style.alignItems = 'center';
    popupFooter.style.justifyContent = 'space-between';
    popupFooter.style.padding = '12px 14px';
    popupFooter.style.borderTop = '1px solid rgba(255, 90, 17, 0.12)';
    popupFooter.style.background = 'linear-gradient(180deg, #fffdfa 0%, #fff6e8 100%)';
    popup.appendChild(popupFooter);

    const popupBrand = document.createElement('div');
    popupBrand.textContent = '校对鸭 🐣';
    popupBrand.style.fontSize = '13px';
    popupBrand.style.fontWeight = '800';
    popupBrand.style.color = '#d97706';
    popupFooter.appendChild(popupBrand);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copy';
    copyButton.style.padding = '7px 12px';
    copyButton.style.border = '1px solid rgba(255, 90, 17, 0.28)';
    copyButton.style.borderRadius = '12px';
    copyButton.style.background = '#fffaf5';
    copyButton.style.color = '#c2410c';
    copyButton.style.fontSize = '12px';
    copyButton.style.fontWeight = '700';
    copyButton.style.cursor = 'pointer';
    popupFooter.appendChild(copyButton);

    const isPopupVisible = () => popup.style.display !== 'none';

    const hideActions = () => {
      actionBar.style.display = 'none';
    };

    const hidePopup = () => {
      popup.style.display = 'none';
    };

    const clearTimers = () => {
      if (hoverHideTimer) {
        window.clearTimeout(hoverHideTimer);
        hoverHideTimer = null;
      }

      if (hoverTranslateTimer) {
        window.clearTimeout(hoverTranslateTimer);
        hoverTranslateTimer = null;
      }
    };

    const hideAllFloatingUi = () => {
      clearTimers();
      hideActions();
      hidePopup();
    };

    const positionPopup = (rect: DOMRect) => {
      const width = Math.min(360, window.innerWidth - 20);
      const popupHeight = popup.offsetHeight || 230;
      const margin = 12;
      const gap = 12;

      const centeredLeft = rect.left + rect.width / 2 - width / 2;
      let left = Math.max(margin, Math.min(window.innerWidth - width - margin, centeredLeft));

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      let top = rect.bottom + gap;

      if (spaceBelow < popupHeight + margin && spaceAbove > popupHeight + margin) {
        top = rect.top - popupHeight - gap;
      } else if (spaceBelow < popupHeight + margin) {
        top = Math.max(margin, window.innerHeight - popupHeight - margin);
      }

      if (left + width > window.innerWidth - margin) {
        left = window.innerWidth - width - margin;
      }

      if (left < margin) {
        left = margin;
      }

      if (top < margin) {
        top = margin;
      }

      if (top + popupHeight > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - popupHeight - margin);
      }

      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
    };

    const renderPopup = (draft: InputDraft, translated: string, rect: DOMRect, notice: string) => {
      popupStatusText.textContent = 'COMPLETED';
      sourceText.textContent = draft.text;
      translationText.textContent = translated;
      engineTag.textContent = toInlineEngineTag(notice);
      copyButton.textContent = 'Copy';
      sidepanelButton.textContent = '🐥';
      positionPopup(rect);
      popup.style.display = 'block';
    };

    const renderPopupFailure = (draft: InputDraft, rect: DOMRect, message: string) => {
      popupStatusText.textContent = 'UNAVAILABLE';
      sourceText.textContent = draft.text;
      translationText.textContent = message;
      engineTag.textContent = '';
      copyButton.textContent = 'Copy';
      sidepanelButton.textContent = '🐣';
      positionPopup(rect);
      popup.style.display = 'block';
    };

    const showTranslating = (draft: InputDraft, rect: DOMRect) => {
      popupStatusText.textContent = 'TRANSLATING';
      sourceText.textContent = draft.text;
      translationText.textContent = '翻译中...';
      engineTag.textContent = '';
      positionPopup(rect);
      popup.style.display = 'block';
    };

    const scheduleHidePopup = () => {
      clearTimers();
      hoverHideTimer = window.setTimeout(() => {
        hidePopup();
      }, 180);
    };

    const scheduleHoverTranslation = () => {
      clearTimers();
      hoverTranslateTimer = window.setTimeout(() => {
        void openHoverTranslation();
      }, 180);
    };

    const openHoverTranslation = async () => {
      const draft = currentDraft ?? getSelectionDraft();
      const selection = window.getSelection();
      if (!draft || !selection || selection.rangeCount === 0) return;

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const settings = await getCurrentSettings();
      void prewarmInlineTranslationHost(settings);
      const cacheKey = buildInlineTranslationCacheKey(draft.text, settings);

      if (lastTranslatedKey === cacheKey && lastTranslatedResult) {
        const reusedNotice = lastTranslatedNotice || '已复用最近一次选区翻译结果';
        renderPopup(draft, lastTranslatedResult, rect, reusedNotice);
        void syncSelectionTranslation(draft, lastTranslatedResult, reusedNotice);
        return;
      }

      showTranslating(draft, rect);

      try {
        const response =
          (await requestSidepanelTranslation(draft.text, settings)) ?? (await requestOffscreenTranslation(draft.text, settings));

        if (!response.ok || !response.result || !response.notice) {
          throw new Error(getInlineTranslationUnavailableMessage(settings));
        }

        const translated = normalizePopupTranslation(response.result);
        const notice = response.notice;
        lastTranslatedKey = cacheKey;
        lastTranslatedText = draft.text;
        lastTranslatedResult = translated;
        lastTranslatedNotice = notice;
        renderPopup(draft, translated, rect, notice);
        void syncSelectionTranslation(draft, translated, notice);
      } catch (error) {
      const message =
          error instanceof Error ? error.message : getInlineTranslationUnavailableMessage(settings);
        renderPopupFailure(draft, rect, message);
      }
    };

    const showButtonForSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        hideAllFloatingUi();
        return;
      }

      const text = normalizeText(selection.toString());
      if (!text) {
        hideAllFloatingUi();
        return;
      }

      currentDraft = getSelectionDraft();
      if (!currentDraft) {
        hideAllFloatingUi();
        return;
      }
      lastSelectionDraft = currentDraft;

      if (lastTranslatedText !== currentDraft.text) {
        lastTranslatedKey = '';
        lastTranslatedResult = '';
        lastTranslatedNotice = '';
        sidepanelButton.textContent = '🐣';
      }

      void getCurrentSettings().then((settings) => {
        void prewarmInlineTranslationHost(settings);
      });

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const anchorX = lastPointerX || rect.left + rect.width / 2;
      const anchorY = lastPointerY || rect.top;
      actionBar.style.left = `${Math.max(12, Math.min(window.innerWidth - 64, anchorX - 22))}px`;
      actionBar.style.top = `${Math.max(12, anchorY - 46)}px`;
      actionBar.style.display = 'flex';
    };

    let lastPointerX = 0;
    let lastPointerY = 0;

    document.addEventListener(
      'mouseup',
      (event) => {
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
      },
      true,
    );

    document.addEventListener('selectionchange', () => {
      window.setTimeout(showButtonForSelection, 0);
    });

    document.addEventListener('scroll', hideAllFloatingUi, true);
    window.addEventListener('resize', hideAllFloatingUi);

    actionBar.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    sidepanelButton.addEventListener('click', async () => {
      const draft = currentDraft ?? getSelectionDraft();
      hideAllFloatingUi();
      if (!draft) return;
      const settings = await getCurrentSettings();
      const cacheKey = buildInlineTranslationCacheKey(draft.text, settings);
      const queuedDraft: InputDraft =
        lastTranslatedKey === cacheKey && lastTranslatedResult
          ? {
              ...draft,
              preferredMode: 'translate',
              autoRun: false,
              prefilledResult: lastTranslatedResult,
              prefilledNotice: lastTranslatedNotice || '已复用页内选区翻译结果',
            }
          : {
              ...draft,
              preferredMode: 'translate',
              autoRun: true,
            };
      await browser.runtime.sendMessage({
        type: RUNTIME_MESSAGES.queueDraft,
        payload: queuedDraft,
      });

      try {
        await openSidePanelFromContent();
      } catch {
        // Keep the draft cached so the user can open the sidepanel manually.
      }
    });

    sidepanelButton.addEventListener('mouseenter', () => {
      scheduleHoverTranslation();
    });

    sidepanelButton.addEventListener('mouseleave', () => {
      scheduleHidePopup();
    });

    popup.addEventListener('mouseenter', () => {
      clearTimers();
    });

    popup.addEventListener('mouseleave', () => {
      scheduleHidePopup();
    });

    closeButton.addEventListener('click', () => {
      clearTimers();
      hidePopup();
    });

    copyButton.addEventListener('click', async () => {
      const text = translationText.textContent ?? '';
      if (!text || text === '翻译中...') return;

      try {
        await navigator.clipboard.writeText(text);
        copyButton.textContent = 'Copied';
      } catch {
        copyButton.textContent = 'Copy failed';
      }
    });

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!isPopupVisible()) {
          return;
        }

        const target = event.target;
        if (!(target instanceof Node)) {
          hidePopup();
          return;
        }

        if (popup.contains(target) || actionBar.contains(target)) {
          return;
        }

        clearTimers();
        hidePopup();
      },
      true,
    );

    browser.runtime.onMessage.addListener((message) => {
      if (message?.type === RUNTIME_MESSAGES.getSelection) {
        const current = getSelectionDraft();
        return Promise.resolve(current?.text ? current : lastSelectionDraft);
      }

      if (message?.type === RUNTIME_MESSAGES.getPageText) {
        return Promise.resolve(getPageDraft());
      }

      return undefined;
    });
  },
});

function normalizePopupTranslation(result: string) {
  return result.replace(/^翻译兜底结果（[^）]+）：/, '').trim();
}

function buildInlineFallbackTranslation(text: string) {
  let translated = normalizeText(text);

  for (const [source, target] of Object.entries(INLINE_TRANSLATION_MAP)) {
    translated = translated.replaceAll(new RegExp(`\\b${escapeRegExp(source)}\\b`, 'gi'), target);
  }

  return translated;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getCurrentSettings() {
  const result = await browser.storage.local.get(STORAGE_KEYS.settings);
  const saved = result[STORAGE_KEYS.settings] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...saved };
}

async function requestOffscreenTranslation(text: string, settings: Settings) {
  const timeoutMs = getInlineTranslationTimeoutMs(settings);
  const translationPromise = browser.runtime.sendMessage({
    type: RUNTIME_MESSAGES.offscreenTranslate,
    payload: {
      text,
      settings,
    },
  }) as Promise<{ ok?: boolean; result?: string; notice?: string; error?: string }>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(new Error(getInlineTranslationUnavailableMessage(settings)));
    }, timeoutMs);
  });

  const response = await Promise.race([translationPromise, timeoutPromise]);

  if (!response || typeof response !== 'object') {
    throw new Error(getInlineTranslationUnavailableMessage(settings));
  }

  if ('ok' in response && response.ok === false) {
    throw new Error(
      typeof response.error === 'string' && response.error
        ? response.error
        : getInlineTranslationUnavailableMessage(settings),
    );
  }

  return response;
}

async function requestSidepanelTranslation(text: string, settings: Settings) {
  try {
    const response = (await browser.runtime.sendMessage({
      type: RUNTIME_MESSAGES.runSelectionTranslationInPanel,
      payload: {
        text,
        settings,
      },
    })) as { ok?: boolean; result?: string; notice?: string } | null;

    if (!response || typeof response !== 'object' || !response.ok || !response.result || !response.notice) {
      return null;
    }

    return response;
  } catch {
    return null;
  }
}

async function prewarmInlineTranslationHost(settings: Settings) {
  const warmupKey = buildInlineTranslationWarmupKey(settings);
  if (warmupKey === lastWarmupKey) {
    return;
  }

  lastWarmupKey = warmupKey;

  try {
    await browser.runtime.sendMessage({
      type: RUNTIME_MESSAGES.ensureOffscreenHost,
    });
  } catch {
    lastWarmupKey = '';
  }
}

function toInlineEngineTag(notice: string) {
  return toEngineBadge(notice);
}

async function syncSelectionTranslation(draft: InputDraft, result: string, notice: string) {
  const payload: SelectionTranslationPayload = {
    draft: {
      ...draft,
      preferredMode: 'translate',
      autoRun: false,
      prefilledResult: result,
      prefilledNotice: notice,
    },
    result,
    notice,
  };

  try {
    await browser.runtime.sendMessage({
      type: RUNTIME_MESSAGES.syncSelectionTranslation,
      payload,
    });
  } catch {
    // Ignore sync failures; inline popup already has the result.
  }
}

async function openSidePanelFromContent() {
  const sidePanelApi = (browser as typeof browser & {
    sidePanel?: {
      open?: (options: { windowId: number }) => Promise<void>;
    };
  }).sidePanel;

  if (!sidePanelApi?.open || !browser.windows?.getCurrent) {
    return false;
  }

  const currentWindow = await browser.windows.getCurrent();
  if (!currentWindow.id) {
    return false;
  }

  await sidePanelApi.open({ windowId: currentWindow.id });
  return true;
}
