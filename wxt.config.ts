import { defineConfig } from 'wxt';
import path from 'node:path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@core': path.resolve(__dirname, 'src/core'),
        '@stores': path.resolve(__dirname, 'src/stores'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@engines': path.resolve(__dirname, 'src/engines'),
        '@i18n': path.resolve(__dirname, 'src/i18n'),
        '@utils': path.resolve(__dirname, 'src/utils'),
      },
    },
  }),
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'zh_CN',
    permissions: ['sidePanel', 'storage', 'activeTab'],
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    action: {
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png',
      },
    },
  },
});
