/**
 * Content Script (Cycle 5.3): 页面划词浮标入口
 *
 * WXT 会把这个文件编译成 content_scripts，注入到所有页面。
 * matches 覆盖 http/https，避免注入到 chrome-extension:// 等奇怪 origin。
 *
 * 隔离策略：
 * - 创建 Shadow DOM 容器，避免宿主页 CSS 污染我们的浮标样式
 * - 浮标本身用 position: fixed + zIndex: max，尽力不被覆盖
 */
import { defineContentScript } from 'wxt/utils/define-content-script';
import ReactDOM from 'react-dom/client';
import { SelectionBubbleHost } from '@components/SelectionBubbleHost';

export default defineContentScript({
  matches: ['<all_urls>'],
  // 用 isolated world 避免和宿主页 JS 冲突（wxt 默认）
  runAt: 'document_idle',
  main() {
    // Shadow DOM 隔离样式；host 挂到 body 尾部
    const host = document.createElement('div');
    host.id = 'proofduck-selection-bubble-root';
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const mount = document.createElement('div');
    shadow.appendChild(mount);

    const root = ReactDOM.createRoot(mount);
    root.render(<SelectionBubbleHost />);
  },
});
