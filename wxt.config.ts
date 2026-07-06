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
    // Round 6 (#465): 权限收窄 v0.4 —— 静态列 3 引擎的固定域名 required；
    // openai-compat 的 baseUrl 由用户运行时按需授权。
    // 好处：
    // 1) Chrome Web Store 审核不会因 <all_urls> 打回
    // 2) 用户看到的安装权限提示只有"访问 3 个已知域名"，不吓人
    // 3) 隐私默认收窄，只有用户主动配 openai-compat 才会请求对应域名权限
    host_permissions: [
      // free-translate 引擎：Google 公开翻译端点
      'https://translate.googleapis.com/*',
      // webllm 引擎：MLC 模型权重（HuggingFace）+ WASM 库（GitHub raw）
      'https://huggingface.co/*',
      'https://raw.githubusercontent.com/*',
    ],
    // openai-compat 引擎：用户可配置任意 baseUrl（OpenAI / DeepSeek / Groq / 本地 vLLM 等）
    // 用户在 Options 页填了 baseUrl 后，UI 会引导点【授权】触发 chrome.permissions.request
    optional_host_permissions: ['<all_urls>'],
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
