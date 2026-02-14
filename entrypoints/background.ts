export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'OPEN_SIDE_PANEL') {
      if (sender.tab?.id && sender.tab?.windowId) {
        chrome.sidePanel.open({ tabId: sender.tab.id, windowId: sender.tab.windowId });
      }
    }
  });
});
