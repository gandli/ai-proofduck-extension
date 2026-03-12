import { SVG_STRING } from './assets/floatingIcon';
import tailwindStyles from './content-styles.css?inline';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    let floatingIcon: HTMLElement | null = null;
    let translationPopup: HTMLElement | null = null;
    // Cache DOM references to avoid redundant lookups in high-frequency event handlers (e.g., WORKER_UPDATE)
    const popupCache = {
      contentEl: null as HTMLElement | null,
      sourceEl: null as HTMLElement | null,
      statusLabel: null as HTMLElement | null,
      actionContentEl: null as HTMLElement | null,
      translateSection: null as HTMLElement | null,
      actionSection: null as HTMLElement | null,
      copyBtn: null as HTMLElement | null,
    };
    let selectedText = '';
    let lastRect: DOMRect | null = null;
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;

    console.log('[AI Proofduck] Content script initialized.');
    
    interface Settings {
      engine?: string;
      apiKey?: string;
      localModel?: string;
    }

    const createElementWithClass = (tag: string, className: string, textContent?: string) => {
      const el = document.createElement(tag);
      el.className = className;
      if (textContent) el.textContent = textContent;
      return el;
    };

    const createTranslationPopup = () => {
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

      const closeBtn = createElementWithClass('button', 'flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 dark:bg-[#2d2d44] dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:text-[#ff7a3d]');
      closeBtn.id = 'close-popup-btn';
      closeBtn.setAttribute('aria-label', 'Close popup');
      closeBtn.setAttribute('title', 'Close popup');
      // Safe SVG creation via DOMParser
      const parser = new DOMParser();
      const closeIcon = parser.parseFromString('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>', 'image/svg+xml').documentElement;
      closeBtn.appendChild(closeIcon);

      header.appendChild(statusContainer);
      header.appendChild(closeBtn);
      popup.appendChild(header);

      // Original Text Section
      const originalSection = createElementWithClass('div', 'flex flex-col gap-1');
      originalSection.appendChild(createElementWithClass('div', 'px-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide', 'ORIGINAL'));
      const sourceDisplay = createElementWithClass('div', 'w-full max-h-[100px] overflow-y-auto p-2.5 bg-white border border-slate-200 rounded-lg text-[12.5px] leading-relaxed text-slate-500 whitespace-pre-wrap break-words focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 dark:bg-[#23233a] dark:border-[#3f3f5a] dark:text-slate-400');
      sourceDisplay.id = 'source-display';
      sourceDisplay.setAttribute('tabindex', '0');
      sourceDisplay.setAttribute('role', 'region');
      sourceDisplay.setAttribute('aria-label', 'Original text');
      originalSection.appendChild(sourceDisplay);
      popup.appendChild(originalSection);

      // Translation Section
      const translationSection = createElementWithClass('div', 'flex flex-col gap-1');
      translationSection.id = 'translation-section';
      translationSection.appendChild(createElementWithClass('div', 'px-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide', 'TRANSLATION'));
      const translationText = createElementWithClass('div', 'w-full max-h-[120px] overflow-y-auto p-2.5 bg-[#fff5eb] border border-brand-orange/20 rounded-lg text-[12.5px] leading-relaxed text-[#1a1a1a] font-medium whitespace-pre-wrap break-words focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 dark:bg-[#2d1f10] dark:border-brand-orange/30 dark:text-slate-200', 'Translating...');
      translationText.id = 'translation-text';
      translationText.setAttribute('tabindex', '0');
      translationText.setAttribute('role', 'region');
      translationText.setAttribute('aria-label', 'Translated text');
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

      const copyBtn = createElementWithClass('button', 'flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-500 transition-colors hover:bg-brand-orange-light hover:border-brand-orange hover:text-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 dark:bg-[#2d2d44] dark:border-[#4a4a6a] dark:text-slate-400 dark:hover:bg-[#2d1f10] dark:hover:border-brand-orange dark:hover:text-[#ff7a3d]');
      copyBtn.id = 'copy-translation-btn';
      copyBtn.setAttribute('aria-label', 'Copy translation');
      copyBtn.setAttribute('title', 'Copy translation');
      const copyIcon = parser.parseFromString('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>', 'image/svg+xml').documentElement;
      copyBtn.appendChild(copyIcon);
      const copySpan = document.createElement('span');
      copySpan.textContent = 'Copy';
      copyBtn.appendChild(copySpan);

      footer.appendChild(copyBtn);
      popup.appendChild(footer);

      shadowRootNode.appendChild(popup);
      
      // Events
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
            
            // Copied state (DOM manipulation without innerHTML)
            while (copyBtn.firstChild) {
              copyBtn.removeChild(copyBtn.firstChild);
            }
            const copiedSpan = document.createElement('span');
            copiedSpan.textContent = 'Copied!';
            copyBtn.appendChild(copiedSpan);

            copyBtn.classList.add('bg-brand-orange', 'text-white', 'border-brand-orange');
            copyBtn.classList.remove('bg-white', 'text-slate-500', 'hover:bg-brand-orange-light', 'hover:text-brand-orange');
            
            setTimeout(() => {
              // Restore original state
              while (copyBtn.firstChild) {
                copyBtn.removeChild(copyBtn.firstChild);
              }
              // Re-parse icon to ensure fresh node
              const freshIcon = parser.parseFromString('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>', 'image/svg+xml').documentElement;
              copyBtn.appendChild(freshIcon);
              const freshSpan = document.createElement('span');
              freshSpan.textContent = 'Copy';
              copyBtn.appendChild(freshSpan);

              copyBtn.classList.remove('bg-brand-orange', 'text-white', 'border-brand-orange');
              copyBtn.classList.add('bg-white', 'text-slate-500', 'hover:bg-brand-orange-light', 'hover:text-brand-orange');
            }, 2000);
          } catch (err) {
            console.error('[AI Proofduck] Copy failed:', err);
          }
        }
      });

      document.body.appendChild(container);
      return container;
    };

    const showTranslation = async (text: string, rect: DOMRect) => {
      console.log('[AI Proofduck] Showing translation for:', text.substring(0, 20) + '...');
      
      // Update storage so sidepanel stays in sync
      await browser.storage.local.set({ selectedText: text });

      if (!translationPopup) {
        translationPopup = createTranslationPopup();
        const shadowRootNode = translationPopup.shadowRoot!;
        popupCache.contentEl = shadowRootNode.getElementById('translation-text')!;
        popupCache.sourceEl = shadowRootNode.getElementById('source-display')!;
        popupCache.statusLabel = shadowRootNode.getElementById('status-label')!;
        popupCache.actionContentEl = shadowRootNode.getElementById('action-content')!;
        popupCache.translateSection = shadowRootNode.getElementById('translation-section')!;
        popupCache.actionSection = shadowRootNode.getElementById('action-section')!;
        popupCache.copyBtn = shadowRootNode.getElementById('copy-translation-btn')!;
      }

      const { contentEl, sourceEl, statusLabel, actionContentEl, translateSection, actionSection, copyBtn } = popupCache;

      if (sourceEl) sourceEl.textContent = text;

      const showActionUI = (msg: string, btnText: string, onAction: () => void | Promise<void>) => {
        if (translateSection) translateSection.classList.add('hidden');
        if (actionSection) actionSection.classList.remove('hidden');
        if (copyBtn) (copyBtn as HTMLElement).style.visibility = 'hidden';
        
        if (actionContentEl) {
          while (actionContentEl.firstChild) { actionContentEl.removeChild(actionContentEl.firstChild); } // Clear previous content safely
          const container = createElementWithClass('div', 'flex flex-col gap-3');
          const msgSpan = createElementWithClass('span', 'text-[13px] leading-relaxed text-slate-600 dark:text-slate-400', msg);
          const actionBtn = createElementWithClass('button', 'w-full py-2 bg-brand-orange text-white text-[12px] font-bold rounded-lg shadow-sm transition-all hover:bg-brand-orange-dark hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50', btnText);
          actionBtn.id = 'popup-action-btn';

          container.appendChild(msgSpan);
          container.appendChild(actionBtn);
          actionContentEl.appendChild(container);

          actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onAction();
          });
        }
      };

      const showTranslateUI = () => {
        if (translateSection) translateSection.classList.remove('hidden');
        if (actionSection) actionSection.classList.add('hidden');
        if (copyBtn) (copyBtn as HTMLElement).style.visibility = 'visible';
      };

      const handleError = (errorCode: string) => {
        if (statusLabel) statusLabel.textContent = 'ACTION REQUIRED';
        
        let errorMsg = 'Unknown error.';
        let btnLabel = 'Check Settings';
        let onAction: () => void | Promise<void> = async () => {
          await browser.storage.local.set({ activeTab: 'settings' });
          browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
          hideTranslation();
        };

        if (errorCode === 'NO_API_KEY') {
          errorMsg = 'API Key is missing. Please configure it in settings.';
          btnLabel = 'Set API Key';
        } else if (errorCode === 'NO_MODEL') {
          errorMsg = 'Local model is not selected. Please choose a model.';
          btnLabel = 'Select Model';
        } else if (errorCode === 'ENGINE_NOT_READY' || errorCode === 'UNAVAILABLE') {
          errorMsg = errorCode === 'UNAVAILABLE' 
            ? 'Translation unavailable. Ensure sidepanel is active.' 
            : 'Engine is not ready. Open sidepanel to initialize.';
          btnLabel = 'Open Sidepanel';
          onAction = async () => {
            browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
            hideTranslation();
          };
        } else if (errorCode === 'ENGINE_LOADING') {
          errorMsg = 'Initializing the model may take a few minutes, please do not close the sidebar.';
          btnLabel = 'View Progress';
          onAction = async () => {
            browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
            hideTranslation();
          };
        } else if (errorCode === 'TIMEOUT') {
          errorMsg = 'Translation timed out. Please try again.';
          btnLabel = 'Retry';
          onAction = async () => {
            showTranslation(text, rect);
          };
        } else if (errorCode === 'CONNECTION_FAILED') {
          errorMsg = 'Connection failed. Is the sidepanel open?';
          btnLabel = 'Try Opening Sidepanel';
          onAction = async () => {
            browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
            hideTranslation();
          };
        }

        showActionUI(errorMsg, btnLabel, onAction);
      };
      
      // Proactive check: check both settings and engine status
      const storage = await browser.storage.local.get(['settings', 'engineStatus']);
      let settings = storage.settings as Settings | undefined;
      const engineStatus = storage.engineStatus as string | undefined;
      
      // If settings don't exist in storage yet, use defaults similar to App.tsx
      if (!settings) {
        settings = {
          engine: 'local-gpu',
          localModel: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
        };
      }

      // Handle loading status proactively
      if (engineStatus === 'loading') {
        handleError('ENGINE_LOADING');
        updatePopupPosition(rect);
        translationPopup.style.display = 'block';
        return;
      }

      if (settings.engine === 'online' && !settings.apiKey) {
        const session = await browser.storage.session.get('apiKey').catch(() => ({ apiKey: undefined }));
        if (!session.apiKey) {
          handleError('NO_API_KEY');
          updatePopupPosition(rect);
          translationPopup.style.display = 'block';
          return;
        }
      } else if ((settings.engine === 'local-gpu' || settings.engine === 'local-wasm') && !settings.localModel) {
        handleError('NO_MODEL');
        updatePopupPosition(rect);
        translationPopup.style.display = 'block';
        return;
      } else if ((settings.engine === 'local-gpu' || settings.engine === 'local-wasm') && engineStatus !== 'ready') {
        handleError('ENGINE_NOT_READY');
        updatePopupPosition(rect);
        translationPopup.style.display = 'block';
        return;
      }

      // Default translation UI
      showTranslateUI();
      if (contentEl) contentEl.textContent = 'Translating...';
      if (statusLabel) statusLabel.textContent = 'TRANSLATING';

      updatePopupPosition(rect);
      translationPopup.style.display = 'block';

      try {
        const response = await browser.runtime.sendMessage({
          type: 'QUICK_TRANSLATE',
          text: text
        });

        if (response && response.translatedText) {
          if (contentEl) contentEl.textContent = response.translatedText;
          if (statusLabel) statusLabel.textContent = 'COMPLETED';
        } else if (response && response.error) {
          handleError(response.error);
        } else if (response && response.status === 'translation_started') {
          // Successfully started, now wait for WORKER_UPDATE broadcasts
          console.log('[AI Proofduck] Translation intent accepted by background.');
        } else {
          handleError('UNAVAILABLE');
        }
      } catch (err) {
        console.error('[AI Proofduck] Translation message error:', err);
        handleError('CONNECTION_FAILED');
      }
    };

    const updatePopupPosition = (rect: DOMRect) => {
      if (!translationPopup) return;
      
      // Smart Positioning with Collision Detection
      const popupWidth = 300;
      const popupMaxHeight = 280; // Adjusted for error states
      const offset = 8;
      const margin = 15;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let left = rect.left + scrollX;
      let top = rect.bottom + scrollY + offset;

      // Vertical Check: Try Below first, then Above if no space
      const spaceBelow = viewportHeight - (rect.bottom - scrollY);
      const spaceAbove = rect.top - margin;
      
      if (spaceBelow < popupMaxHeight + margin && spaceAbove > spaceBelow) {
        // Show ABOVE
        top = rect.top + scrollY - popupMaxHeight - offset;
        // Adjust if it still goes off top
        if (top < scrollY + margin) top = scrollY + margin;
      } else {
        // Show BELOW (default)
        // Adjust if it goes off bottom
        if (top + popupMaxHeight > scrollY + viewportHeight - margin) {
            top = scrollY + viewportHeight - popupMaxHeight - margin;
        }
      }

      // Horizontal Check: Center if possible, or snap to edges
      if (left + popupWidth > scrollX + viewportWidth - margin) {
        left = scrollX + viewportWidth - popupWidth - margin;
      }
      if (left < scrollX + margin) left = scrollX + margin;

      translationPopup.style.left = `${left}px`;
      translationPopup.style.top = `${top}px`;
    };

    const hideTranslation = () => {
      if (translationPopup) {
        translationPopup.style.display = 'none';
      }
    };

    const createFloatingIcon = () => {
      const container = document.createElement('div');
      container.id = 'ai-proofduck-icon-container';
      // Force absolute positioning and high z-index to avoid page interference
      container.style.position = 'absolute';
      container.style.zIndex = '2147483647';
      container.style.display = 'none';
      container.style.pointerEvents = 'auto';
      container.style.cursor = 'pointer';
      
      const shadowRootNode = container.attachShadow({ mode: 'open' });

      // Tailwind styles
      const twStyle = document.createElement('style');
      twStyle.textContent = tailwindStyles;
      shadowRootNode.appendChild(twStyle);

      const icon = document.createElement('div');
      // Using Tailwind for basic styling and layout
      icon.className = 'w-6 h-6 flex drop-shadow-md transition-transform duration-200 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-[1.15]';

      // Robust SVG parsing: remove any leading/trailing whitespace
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(SVG_STRING.trim(), 'image/svg+xml');
      
      const parserError = svgDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        console.error('[AI Proofduck] SVG parse error:', parserError[0].textContent);
        // Fallback or debug info
        const errorMsg = document.createElement('div');
        errorMsg.textContent = '🐣';
        icon.appendChild(errorMsg);
      } else if (svgDoc.documentElement && svgDoc.documentElement.nodeName === 'svg') {
        icon.appendChild(svgDoc.documentElement);
      } else {
        console.error('[AI Proofduck] SVG document root not found or invalid.');
      }

      shadowRootNode.appendChild(icon);

      container.addEventListener('mouseenter', () => {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          if (selectedText && lastRect) {
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
        await browser.storage.local.set({ selectedText });
        hideIcon();
        hideTranslation();
      });

      document.body.appendChild(container);
      return container;
    };

    const showIcon = (rect: DOMRect) => {
      if (!floatingIcon) {
        floatingIcon = createFloatingIcon();
      }

      const iconWidth = 24;
      const iconHeight = 24;
      const offset = 5;

      let left = rect.right + window.scrollX - iconWidth / 2;
      let top = rect.top + window.scrollY - iconHeight - offset;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      if (left + iconWidth > scrollX + viewportWidth - 10) left = scrollX + viewportWidth - iconWidth - 10;
      if (left < scrollX + 10) left = scrollX + 10;
      if (top < scrollY + 10) top = rect.bottom + window.scrollY + offset;
      if (top + iconHeight > scrollY + viewportHeight - 10) top = scrollY + viewportHeight - iconHeight - 10;

      floatingIcon.style.left = `${left}px`;
      floatingIcon.style.top = `${top}px`;
      floatingIcon.style.display = 'block';
    };

    const hideIcon = () => {
      if (floatingIcon) {
        floatingIcon.style.display = 'none';
      }
    };

    document.addEventListener('mouseup', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Use local variables to avoid redundant DOM queries during high-frequency events
      const iconContainer = floatingIcon;
      const popupContainer = translationPopup;
      
      const isInsideUI = (iconContainer && iconContainer.contains(target)) || 
                        (popupContainer && popupContainer.contains(target));

      if (isInsideUI) {
        return; 
      }

      setTimeout(() => {
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
      }, 10);
    });

    document.addEventListener('mousedown', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Use local variables to avoid redundant DOM queries during high-frequency events
      const iconContainer = floatingIcon;
      const popupContainer = translationPopup;
      
      const isInsideUI = (iconContainer && iconContainer.contains(target)) || 
                        (popupContainer && popupContainer.contains(target));

      if (!isInsideUI) {
        hideIcon();
        hideTranslation();
        if (hoverTimer) clearTimeout(hoverTimer);
      }
    });

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_CONTENT') {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        sendResponse({ content: text || document.body.innerText });
      } else if (message.type === 'WORKER_UPDATE') {
        // Handle incoming translation results for the floating popup
        const { type, text, mode: msgMode } = message.data;
        if (translationPopup && translationPopup.style.display === 'block' && msgMode === 'translate') {
          const contentEl = popupCache.contentEl;
          const statusLabel = popupCache.statusLabel;
          
          if (type === 'update' || type === 'complete') {
            if (contentEl) contentEl.textContent = text || 'Translating...';
            if (type === 'complete' && statusLabel) statusLabel.textContent = 'COMPLETED';
          } else if (type === 'error') {
            if (statusLabel) statusLabel.textContent = 'ERROR';
            if (contentEl) contentEl.textContent = `Error: ${message.data.error}`;
          }
        }
      }
    });

    // Listen for storage changes to update popup status (e.g. when engine becomes ready)
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.engineStatus && translationPopup && translationPopup.style.display === 'block') {
        const newStatus = changes.engineStatus.newValue as string;
        const oldStatus = changes.engineStatus.oldValue as string;
        
        console.log(`[AI Proofduck] Engine status changed: ${oldStatus} -> ${newStatus}`);
        
        // If it becomes ready and we were showing an "Action Required" UI, retry translation
        if (newStatus === 'ready' && selectedText) {
          const statusLabel = popupCache.statusLabel;
          if (statusLabel && statusLabel.textContent === 'ACTION REQUIRED') {
            console.log('[AI Proofduck] Engine ready, retrying translation automatically...');
            showTranslation(selectedText, lastRect || new DOMRect());
          }
        }
      }
    });
  },
});
