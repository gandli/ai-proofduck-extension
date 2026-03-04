import { SVG_STRING } from './assets/floatingIcon';
import tailwindStyles from './content-styles.css?inline';

// ============================================================
// Content Script - AI Proofduck Floating Icon & Translation Popup
// ============================================================

interface Settings {
  engine?: string;
  apiKey?: string;
  localModel?: string;
}

interface WorkerUpdateMessage {
  type: 'WORKER_UPDATE';
  data: {
    type: 'update' | 'complete' | 'error';
    text?: string;
    mode?: string;
    error?: string;
  };
}

interface GetPageContentMessage {
  type: 'GET_PAGE_CONTENT';
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // State management with weak references where possible
    let floatingIcon: HTMLElement | null = null;
    let translationPopup: HTMLElement | null = null;
    let selectedText = '';
    let lastRect: DOMRect | null = null;
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;
    let isProcessing = false;

    console.log('[AI Proofduck] Content script initialized.');

    // Reusable DOMParser instance
    const svgParser = new DOMParser();

    // ============================================================
    // Utility Functions
    // ============================================================

    const createElementWithClass = (
      tag: string, 
      className: string, 
      textContent?: string
    ): HTMLElement => {
      const el = document.createElement(tag);
      el.className = className;
      if (textContent) el.textContent = textContent;
      return el;
    };

    const clearElement = (el: HTMLElement): void => {
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    };

    // ============================================================
    // Translation Popup
    // ============================================================

    const createTranslationPopup = (): HTMLElement => {
      const container = document.createElement('div');
      container.id = 'ai-proofduck-translation-popup';
      const shadowRootNode = container.attachShadow({ mode: 'open' });

      // Tailwind styles
      const twStyle = document.createElement('style');
      twStyle.textContent = tailwindStyles;
      shadowRootNode.appendChild(twStyle);

      const popup = createElementWithClass('div', 'w-[300px] flex flex-col gap-2 p-3 bg-[#fbfbfb] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-slate-200 text-[#1a1a1a] dark:bg-[#1a1a2e] dark:border-[#3f3f5a] dark:text-slate-200');

      // Header
      const header = createElementWithClass('div', 'flex items-center justify-between mb-0.5');
      const statusContainer = createElementWithClass('div', 'flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-orange-light dark:bg-[#2d2d44]');
      const statusDot = createElementWithClass('span', 'w-1.5 h-1.5 rounded-full bg-brand-orange');
      const statusLabel = createElementWithClass('span', 'text-[10px] font-bold text-brand-orange uppercase tracking-wide', 'TRANSLATING');
      statusLabel.id = 'status-label';
      statusContainer.appendChild(statusDot);
      statusContainer.appendChild(statusLabel);

      const closeBtn = createElementWithClass('button', 'flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-brand-orange dark:bg-[#2d2d44] dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:text-[#ff7a3d]');
      closeBtn.id = 'close-popup-btn';
      closeBtn.setAttribute('aria-label', 'Close translation popup');
      
      // Safe SVG creation via DOMParser
      const closeIcon = svgParser.parseFromString(
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        'image/svg+xml'
      ).documentElement;
      closeBtn.appendChild(closeIcon);

      header.appendChild(statusContainer);
      header.appendChild(closeBtn);
      popup.appendChild(header);

      // Original Text Section
      const originalSection = createElementWithClass('div', 'flex flex-col gap-1');
      originalSection.appendChild(createElementWithClass('div', 'px-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide', 'ORIGINAL'));
      const sourceDisplay = createElementWithClass('div', 'w-full max-h-[100px] overflow-y-auto p-2.5 bg-white border border-slate-200 rounded-lg text-[12.5px] leading-relaxed text-slate-500 whitespace-pre-wrap break-words dark:bg-[#23233a] dark:border-[#3f3f5a] dark:text-slate-400');
      sourceDisplay.id = 'source-display';
      originalSection.appendChild(sourceDisplay);
      popup.appendChild(originalSection);

      // Translation Section
      const translationSection = createElementWithClass('div', 'flex flex-col gap-1');
      translationSection.id = 'translation-section';
      translationSection.appendChild(createElementWithClass('div', 'px-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide', 'TRANSLATION'));
      const translationText = createElementWithClass('div', 'w-full max-h-[120px] overflow-y-auto p-2.5 bg-[#fff5eb] border border-brand-orange/20 rounded-lg text-[12.5px] leading-relaxed text-[#1a1a1a] font-medium whitespace-pre-wrap break-words dark:bg-[#2d1f10] dark:border-brand-orange/30 dark:text-slate-200', 'Translating...');
      translationText.id = 'translation-text';
      translationSection.appendChild(translationText);
      popup.appendChild(translationSection);

      // Action Section (Hidden by default)
      const actionSection = createElementWithClass('div', 'hidden flex flex-col gap-1');
      actionSection.id = 'action-section';
      actionSection.appendChild(createElementWithClass('div', 'px-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide', 'SETUP GUIDE'));
      const actionContent = createElementWithClass('div', 'w-full p-3 bg-slate-50 border border-slate-200 rounded-lg dark:bg-[#2d2d44] dark:border-[#3f3f5a]');
      actionContent.id = 'action-content';
      actionSection.appendChild(actionContent);
      popup.appendChild(actionSection);

      // Footer
      const footer = createElementWithClass('div', 'flex items-center justify-between pt-2 mt-0.5 border-t border-slate-100 dark:border-[#2d2d44]');
      footer.appendChild(createElementWithClass('div', 'flex items-center gap-1 text-[11px] font-extrabold text-brand-orange', 'AI Proofduck 🐣'));

      const copyBtn = createElementWithClass('button', 'flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-500 transition-colors hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange dark:bg-[#2d2d44] dark:border-[#4a4a6a] dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]');
      copyBtn.id = 'copy-translation-btn';
      copyBtn.setAttribute('aria-label', 'Copy translation');
      
      const copyIcon = svgParser.parseFromString(
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
        'image/svg+xml'
      ).documentElement;
      copyBtn.appendChild(copyIcon);
      
      const copySpan = document.createElement('span');
      copySpan.textContent = 'Copy';
      copySpan.id = 'copy-btn-text';
      copyBtn.appendChild(copySpan);

      footer.appendChild(copyBtn);
      popup.appendChild(footer);

      shadowRootNode.appendChild(popup);

      // Event handlers
      closeBtn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        hideTranslation();
      });

      copyBtn.addEventListener('click', async (e: MouseEvent) => {
        e.stopPropagation();
        const text = translationText.textContent;
        if (text && text !== 'Translating...') {
          try {
            await navigator.clipboard.writeText(text);
            updateCopyButtonState(copyBtn, copySpan, true);
            setTimeout(() => updateCopyButtonState(copyBtn, copySpan, false), 2000);
          } catch (err) {
            console.error('[AI Proofduck] Copy failed:', err);
          }
        }
      });

      document.body.appendChild(container);
      return container;
    };

    const updateCopyButtonState = (btn: HTMLElement, textSpan: HTMLElement, copied: boolean): void => {
      clearElement(btn);
      
      if (copied) {
        textSpan.textContent = 'Copied!';
        btn.appendChild(textSpan);
        btn.classList.add('bg-brand-orange', 'text-white', 'border-brand-orange');
        btn.classList.remove('bg-white', 'text-slate-500', 'hover:bg-brand-orange-light', 'hover:text-brand-orange');
      } else {
        const freshIcon = svgParser.parseFromString(
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
          'image/svg+xml'
        ).documentElement;
        btn.appendChild(freshIcon);
        
        textSpan.textContent = 'Copy';
        btn.appendChild(textSpan);
        
        btn.classList.remove('bg-brand-orange', 'text-white', 'border-brand-orange');
        btn.classList.add('bg-white', 'text-slate-500', 'hover:bg-brand-orange-light', 'hover:text-brand-orange');
      }
    };

    // ============================================================
    // Translation Logic
    // ============================================================

    const showTranslation = async (text: string, rect: DOMRect): Promise<void> => {
      if (isProcessing) return;
      isProcessing = true;

      console.log('[AI Proofduck] Showing translation for:', text.substring(0, 20) + '...');

      // Update storage so sidepanel stays in sync
      try {
        await browser.storage.local.set({ selectedText: text });
      } catch (e) {
        console.warn('[AI Proofduck] Failed to update storage:', e);
      }

      if (!translationPopup) {
        translationPopup = createTranslationPopup();
      }

      const shadowRootNode = translationPopup.shadowRoot!;
      const contentEl = shadowRootNode.getElementById('translation-text')!;
      const sourceEl = shadowRootNode.getElementById('source-display')!;
      const statusLabel = shadowRootNode.getElementById('status-label')!;
      const actionContentEl = shadowRootNode.getElementById('action-content')!;
      const translateSection = shadowRootNode.getElementById('translation-section')!;
      const actionSection = shadowRootNode.getElementById('action-section')!;
      const copyBtn = shadowRootNode.getElementById('copy-translation-btn')!;

      sourceEl.textContent = text;
      contentEl.textContent = 'Translating...';
      statusLabel.textContent = 'TRANSLATING';
      showTranslateUI();

      positionPopup(translationPopup, rect);
      translationPopup.style.display = 'block';

      // Request translation from background
      try {
        const response = await browser.runtime.sendMessage({
          type: 'QUICK_TRANSLATE',
          text,
        }) as { translatedText?: string; error?: string };

        if (response?.error) {
          handleError(response.error, text, rect);
        } else if (response?.translatedText) {
          contentEl.textContent = response.translatedText;
          statusLabel.textContent = 'COMPLETED';
        }
      } catch (e) {
        handleError('CONNECTION_FAILED', text, rect);
      } finally {
        isProcessing = false;
      }

      function showTranslateUI(): void {
        translateSection.classList.remove('hidden');
        actionSection.classList.add('hidden');
        if (copyBtn) copyBtn.style.visibility = 'visible';
      }

      function showActionUI(msg: string, btnText: string, onAction: () => void | Promise<void>): void {
        translateSection.classList.add('hidden');
        actionSection.classList.remove('hidden');
        if (copyBtn) (copyBtn as HTMLElement).style.visibility = 'hidden';

        clearElement(actionContentEl);
        const container = createElementWithClass('div', 'flex flex-col gap-3');
        const msgSpan = createElementWithClass('span', 'text-[13px] leading-relaxed text-slate-600 dark:text-slate-400', msg);
        const actionBtn = createElementWithClass('button', 'w-full py-2 bg-brand-orange text-white text-[12px] font-bold rounded-lg shadow-sm transition-all hover:bg-brand-orange-dark hover:shadow-md active:scale-[0.98]', btnText);
        actionBtn.id = 'popup-action-btn';

        container.appendChild(msgSpan);
        container.appendChild(actionBtn);
        actionContentEl.appendChild(container);

        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onAction();
        });
      }

      function handleError(errorCode: string, text: string, rect: DOMRect): void {
        statusLabel.textContent = 'ACTION REQUIRED';

        const errorHandlers: Record<string, { msg: string; btn: string; action: () => void | Promise<void> }> = {
          NO_API_KEY: {
            msg: 'API Key is missing. Please configure it in settings.',
            btn: 'Set API Key',
            action: openSettings,
          },
          NO_MODEL: {
            msg: 'Local model is not selected. Please choose a model.',
            btn: 'Select Model',
            action: openSettings,
          },
          ENGINE_NOT_READY: {
            msg: 'Engine is not ready. Open sidepanel to initialize.',
            btn: 'Open Sidepanel',
            action: openSidePanel,
          },
          UNAVAILABLE: {
            msg: 'Translation unavailable. Ensure sidepanel is active.',
            btn: 'Open Sidepanel',
            action: openSidePanel,
          },
          ENGINE_LOADING: {
            msg: 'Initializing the model may take a few minutes, please do not close the sidebar.',
            btn: 'View Progress',
            action: openSidePanel,
          },
          TIMEOUT: {
            msg: 'Translation timed out. Please try again.',
            btn: 'Retry',
            action: () => showTranslation(text, rect),
          },
          CONNECTION_FAILED: {
            msg: 'Connection failed. Is the sidepanel open?',
            btn: 'Try Opening Sidepanel',
            action: openSidePanel,
          },
        };

        const handler = errorHandlers[errorCode] || {
          msg: `Error: ${errorCode}`,
          btn: 'Check Settings',
          action: openSettings,
        };

        showActionUI(handler.msg, handler.btn, handler.action);
      }

      function openSettings(): void {
        browser.storage.local.set({ activeTab: 'settings' });
        browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
        hideTranslation();
      }

      function openSidePanel(): void {
        browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
        hideTranslation();
      }
    };

    const hideTranslation = (): void => {
      if (translationPopup) {
        translationPopup.style.display = 'none';
      }
      isProcessing = false;
    };

    const positionPopup = (popup: HTMLElement, rect: DOMRect): void => {
      const popupWidth = 300;
      const popupHeight = 250;
      const offset = 10;

      let left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY + offset;

      // Boundary checks
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      if (left + popupWidth > scrollX + viewportWidth) {
        left = scrollX + viewportWidth - popupWidth - 10;
      }
      if (left < scrollX) {
        left = scrollX + 10;
      }
      if (top + popupHeight > scrollY + viewportHeight) {
        top = rect.top + window.scrollY - popupHeight - offset;
      }
      if (top < scrollY) {
        top = scrollY + 10;
      }

      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
    };

    // ============================================================
    // Floating Icon
    // ============================================================

    const createFloatingIcon = (): HTMLElement => {
      const container = document.createElement('div');
      container.id = 'ai-proofduck-icon-container';
      container.style.cssText = 'position:absolute;z-index:2147483646;display:none;';

      const shadowRootNode = container.attachShadow({ mode: 'open' });

      // Styles
      const style = document.createElement('style');
      style.textContent = `
        .icon-wrapper {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%);
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .icon-wrapper:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.5);
        }
        .icon-wrapper svg {
          width: 16px;
          height: 16px;
          color: white;
        }
      `;
      shadowRootNode.appendChild(style);

      const icon = createElementWithClass('div', 'icon-wrapper');
      icon.setAttribute('role', 'button');
      icon.setAttribute('aria-label', 'Open AI Proofduck');

      // Parse SVG safely
      const svgDoc = svgParser.parseFromString(SVG_STRING, 'image/svg+xml');
      const parserError = svgDoc.querySelector('parsererror');
      
      if (parserError) {
        console.error('[AI Proofduck] SVG parse error:', parserError.textContent);
        const errorMsg = document.createElement('div');
        errorMsg.textContent = '🐣';
        icon.appendChild(errorMsg);
      } else if (svgDoc.documentElement?.nodeName === 'svg') {
        icon.appendChild(svgDoc.documentElement);
      } else {
        console.error('[AI Proofduck] SVG document root not found or invalid.');
      }

      shadowRootNode.appendChild(icon);

      // Event handlers
      container.addEventListener('mouseenter', () => {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          if (selectedText && lastRect && !isProcessing) {
            showTranslation(selectedText, lastRect);
          }
        }, 800);
      });

      container.addEventListener('mouseleave', () => {
        if (hoverTimer) clearTimeout(hoverTimer);
      });

      icon.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      });

      icon.addEventListener('click', async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Send message first to preserve user gesture context
        browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
        
        try {
          await browser.storage.local.set({ selectedText });
        } catch (err) {
          console.warn('[AI Proofduck] Failed to save selection:', err);
        }
        
        hideIcon();
        hideTranslation();
      });

      document.body.appendChild(container);
      return container;
    };

    const showIcon = (rect: DOMRect): void => {
      if (!floatingIcon) {
        floatingIcon = createFloatingIcon();
      }

      const iconWidth = 28;
      const iconHeight = 28;
      const offset = 5;

      let left = rect.right + window.scrollX - iconWidth / 2;
      let top = rect.top + window.scrollY - iconHeight - offset;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Boundary checks
      if (left + iconWidth > scrollX + viewportWidth - 10) {
        left = scrollX + viewportWidth - iconWidth - 10;
      }
      if (left < scrollX + 10) {
        left = scrollX + 10;
      }
      if (top < scrollY + 10) {
        top = rect.bottom + window.scrollY + offset;
      }
      if (top + iconHeight > scrollY + viewportHeight - 10) {
        top = scrollY + viewportHeight - iconHeight - 10;
      }

      floatingIcon.style.left = `${left}px`;
      floatingIcon.style.top = `${top}px`;
      floatingIcon.style.display = 'block';
    };

    const hideIcon = (): void => {
      if (floatingIcon) {
        floatingIcon.style.display = 'none';
      }
    };

    // ============================================================
    // Document Event Listeners
    // ============================================================

    const isInsideUI = (target: HTMLElement): boolean => {
      const iconContainer = document.getElementById('ai-proofduck-icon-container');
      const popupContainer = document.getElementById('ai-proofduck-translation-popup');
      return !!(iconContainer?.contains(target) || popupContainer?.contains(target));
    };

    document.addEventListener('mouseup', (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (isInsideUI(target)) {
        return;
      }

      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
          selectedText = text;
          const range = selection?.getRangeAt(0);
          if (range) {
            lastRect = range.getBoundingClientRect();
            showIcon(lastRect);
          }
        } else {
          hideIcon();
        }
      });
    });

    document.addEventListener('mousedown', (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (!isInsideUI(target)) {
        hideIcon();
        hideTranslation();
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      hideIcon();
      hideTranslation();
    });

    // Handle scroll (throttled)
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        hideIcon();
        hideTranslation();
        scrollTimeout = null;
      }, 100);
    }, { passive: true });

    // ============================================================
    // Runtime Message Handlers
    // ============================================================

    browser.runtime.onMessage.addListener((message: GetPageContentMessage | WorkerUpdateMessage, _sender, sendResponse) => {
      if (message.type === 'GET_PAGE_CONTENT') {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        
        // Get main content without scripts and styles
        let pageContent = '';
        if (!text) {
          const bodyClone = document.body.cloneNode(true) as HTMLElement;
          const scripts = bodyClone.querySelectorAll('script, style, nav, header, footer, aside');
          scripts.forEach(el => el.remove());
          pageContent = bodyClone.innerText.slice(0, 10000); // Limit content length
        }
        
        sendResponse({ content: text || pageContent });
        return true;
      }

      if (message.type === 'WORKER_UPDATE') {
        const { type, text, mode: msgMode, error } = message.data;
        
        if (translationPopup?.style.display === 'block' && msgMode === 'translate') {
          const shadowRootNode = translationPopup.shadowRoot!;
          const contentEl = shadowRootNode.getElementById('translation-text');
          const statusLabel = shadowRootNode.getElementById('status-label');

          if (contentEl && statusLabel) {
            if (type === 'update' || type === 'complete') {
              contentEl.textContent = text || 'Translating...';
              if (type === 'complete') statusLabel.textContent = 'COMPLETED';
            } else if (type === 'error') {
              statusLabel.textContent = 'ERROR';
              contentEl.textContent = `Error: ${error}`;
            }
          }
        }
        return true;
      }

      return false;
    });

    // Listen for storage changes
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.engineStatus || !translationPopup) {
        return;
      }

      const newStatus = changes.engineStatus.newValue as string;
      const oldStatus = changes.engineStatus.oldValue as string;

      console.log(`[AI Proofduck] Engine status changed: ${oldStatus} -> ${newStatus}`);

      // Auto-retry if engine becomes ready
      if (newStatus === 'ready' && selectedText && translationPopup.style.display === 'block') {
        const shadowRootNode = translationPopup.shadowRoot!;
        const statusLabel = shadowRootNode.getElementById('status-label');
        
        if (statusLabel?.textContent === 'ACTION REQUIRED') {
          console.log('[AI Proofduck] Engine ready, retrying translation...');
          showTranslation(selectedText, lastRect || new DOMRect());
        }
      }
    });
  },
});
