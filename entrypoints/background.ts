const MODES = [
  { id: 'summarize', title: '摘要 (Summarize)' },
  { id: 'correct', title: '润色 (Polish)' },
  { id: 'proofread', title: '校对 (Proofread)' },
  { id: 'translate', title: '翻译 (Translate)' },
  { id: 'expand', title: '扩写 (Expand)' },
];

export default defineBackground(() => {
  console.log('Background Service Worker initialized.');

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Manage Offscreen Document for WebLLM Engine
  async function setupOffscreenDocument() {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
    });

    if (existingContexts.length > 0) {
      return;
    }

    console.log('[Background] Creating Offscreen Document...');
    await chrome.offscreen.createDocument({
      url: browser.runtime.getURL('offscreen.html'),
      reasons: [chrome.offscreen.Reason.LOCAL_STORAGE], // Accessing WebGPU/Worker context
      justification: 'Hosting WebLLM engine for background AI processing'
    });
  }

  async function handleEngineCommand(message: any) {
    await setupOffscreenDocument();
    chrome.runtime.sendMessage({
      ...message,
      target: 'offscreen'
    });
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
    // Avoid feedback loops
    if (message.target === 'offscreen') return;

    if (message.type === 'OPEN_SIDE_PANEL') {
      if (sender.tab?.id && sender.tab?.windowId) {
        chrome.sidePanel.open({ tabId: sender.tab.id, windowId: sender.tab.windowId });
        sendResponse({ status: 'opened' });
      }
    } else if (message.type === 'INIT_ENGINE' || message.type === 'GENERATE') {
      handleEngineCommand(message);
      sendResponse({ status: 'forwarded_to_offscreen' });
    } else if (message.type === 'QUICK_TRANSLATE') {
      browser.storage.local.get('settings').then(res => {
        const safeSettings = {
          engine: 'local-gpu',
          extensionLanguage: '中文',
          tone: 'professional',
          localModel: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
          ...(res.settings || {})
        };
        handleEngineCommand({
          type: 'GENERATE',
          text: message.text,
          mode: 'translate',
          settings: safeSettings
        });
      });
      sendResponse({ status: 'translation_started' });
    } else if (message.type === 'WORKER_UPDATE') {
      // Forward worker updates (like translation progress) to the active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
        }
      });
    } else if (message.type === 'RESET_ENGINE') {
      handleEngineCommand(message);
      browser.storage.local.set({ 
        engineStatus: 'idle',
        lastProgress: null,
        isLocalModelEnabled: false 
      }).then(() => {
        sendResponse({ status: 'reset_complete' });
      });
      return true;
    }
    return true;
  });
});
