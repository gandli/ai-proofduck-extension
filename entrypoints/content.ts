/**
 * Content Script (M1 骨架版)
 *
 * 未来 M2 职责：
 * - 划词浮标（floatingIcon）
 * - 接收 background/side panel 的消息在页面上做原地翻译
 *
 * 当前只做最小骨架：注入即可，无副作用。
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // M1: 空实现，占位注册
    // console.debug('[proofduck] content script loaded');
  },
});
