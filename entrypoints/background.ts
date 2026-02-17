const MODES = [
  { id: 'summarize', title: '摘要 (Summarize)' },
  { id: 'correct', title: '润色 (Polish)' },
  { id: 'proofread', title: '校对 (Proofread)' },
  { id: 'translate', title: '翻译 (Translate)' },
  { id: 'expand', title: '扩写 (Expand)' },
];

export default defineBackground(() => {
  console.log('Background Service Worker initialized.');

  let worker: Worker | null = null;
  let engineStatus = 'idle';

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Initialize Worker in background
  function ensureWorker() {
    if (worker) return worker;
    console.log('[Background] Initializing Model Worker...');
    worker = new Worker(new URL('./sidepanel/worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event) => {
      const { type, progress, text, mode, error } = event.data;
      
      // Update local status tracker
      if (type === 'ready') engineStatus = 'ready';
      if (type === 'error') engineStatus = 'error';
      if (type === 'progress') engineStatus = 'loading';

      // Broadcast to all extension parts (Sidepanel, Tabs)
      browser.runtime.sendMessage({
        type: 'WORKER_UPDATE',
        data: event.data
      }).catch(() => {
        // No listeners open, that's fine
      });

      // Sync specific status to storage for UI recovery
      if (type === 'ready' || type === 'error' || type === 'progress') {
        browser.storage.local.set({ 
          engineStatus,
          lastProgress: progress
        });
      }
    };
    return worker;
  }

  // Create context menu hierarchy on install
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'ai-proofduck-parent',
      title: '使用 AI 校对鸭处理',
      contexts: ['selection'],
    });

    MODES.forEach(mode => {
      browser.contextMenus.create({
        id: `ai-mode-${mode.id}`,
        parentId: 'ai-proofduck-parent',
        title: mode.title,
        contexts: ['selection'],
      });
    });
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (tab?.id && info.menuItemId.toString().startsWith('ai-mode-')) {
      const modeId = info.menuItemId.toString().replace('ai-mode-', '');
      
      if (info.selectionText) {
        await browser.storage.local.set({ 
          selectedText: info.selectionText,
          menuIntentMode: modeId,
          autoTriggerAt: Date.now() 
        });
      }
      
      await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_SIDE_PANEL') {
      if (sender.tab?.id && sender.tab?.windowId) {
        chrome.sidePanel.open({ tabId: sender.tab.id, windowId: sender.tab.windowId });
      }
    } else if (message.type === 'INIT_ENGINE') {
      const w = ensureWorker();
      w.postMessage({ type: 'load', settings: message.settings });
      sendResponse({ status: 'initiated' });
    } else if (message.type === 'GET_ENGINE_STATUS') {
      sendResponse({ status: engineStatus });
    } else if (message.type === 'GENERATE') {
      const w = ensureWorker();
      w.postMessage({
        type: 'generate',
        text: message.text,
        mode: message.mode,
        settings: message.settings
      });
      sendResponse({ status: 'sent' });
    } else if (message.type === 'RESET_ENGINE') {
      if (worker) {
        console.log('[Background] Terminating Worker and resetting engine...');
        worker.terminate();
        worker = null;
      }
      engineStatus = 'idle';
      browser.storage.local.set({ 
        engineStatus: 'idle',
        lastProgress: null,
        isLocalModelEnabled: false 
      });
      sendResponse({ status: 'reset' });
    }
    return true;
  });
});
