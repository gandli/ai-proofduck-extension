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
    host_permissions: [
      // free-translate 引擎：Google 公开翻译端点
      'https://translate.googleapis.com/*',
      // webllm 引擎：MLC 模型权重（HuggingFace）+ WASM 库（GitHub raw）
      'https://huggingface.co/*',
      'https://raw.githubusercontent.com/*',
      // openai-compat 引擎：用户可配置任意 baseUrl（OpenAI / DeepSeek / Groq / 本地 vLLM 等）
      // 用 <all_urls> 是因为 baseUrl 完全由用户决定，无法枚举；安全性由用户对 API Key 的持有托底
      '<all_urls>',
    ],
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
