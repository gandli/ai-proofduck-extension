/**
 * Service Worker（M1 骨架版）
 *
 * TDD 里 background 的职责：
 * 1. 注册 chrome.sidePanel 打开行为（点击扩展图标 → 打开侧边栏）
 * 2. 消息路由中心（M2 之后接入 EngineManager）
 *
 * 现在只做最小可用骨架，让 wxt build 通过。
 */
export default defineBackground(() => {
  // 点击工具栏图标打开 Side Panel（Chrome 114+ API）
  if (typeof chrome !== 'undefined' && chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err: unknown) => console.warn('[proofduck] sidePanel setPanelBehavior failed', err));
  }
});
