import { defineConfig } from 'wxt';
import { EXTENSION_PAGE_CSP } from './entrypoints/shared/manifest-config';

const PROD_EXTENSION_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmkbOCDkojy8TDcQhLQEWgWdsl6mWhEej44kDiBypbdxRbChIBrRnZunWjdQ9YFyvyUEY7EuhqOEDjiiYb+HxydpdJselRNB6cXEvOgDhB+ppqOaLsq61tdPLnddtE4j6PRdgxO7iRPFJtWRb1IJ+PK61SogdqsCqbjUqkrJcJu5QIK9DwyJjPx9JBL1xcO9x/DzVlZyK97ctdfXRpOZspVpC5UAP/rpdKSvLHcV3RTBSuWP9/mkSiM9xE4bFW2Kzn3O8SHmXKaf80q5xfc2ntrbQrZJHaqNz+l717NUYafmPamdmSW5vUXofU+SxY8ewKpiirTah6WpiFVKgQ+jKLwIDAQAB';

// 开发态不再固定扩展 ID，避免被浏览器拦截后整条调试链路失效。
const extensionKey = process.argv.includes('build') ? PROD_EXTENSION_KEY : undefined;

export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '校对鸭',
    description: '本地优先的网页阅读与写作 AI 侧边栏助手',
    ...(extensionKey ? { key: extensionKey } : {}),
    permissions: ['sidePanel', 'storage', 'activeTab', 'tabs', 'offscreen'],
    host_permissions: ['https://*/*', 'http://*/*'],
    action: {
      default_title: '打开校对鸭',
    },
    content_security_policy: {
      extension_pages: EXTENSION_PAGE_CSP,
    },
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
});
