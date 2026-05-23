import { defineConfig } from 'wxt';
import { fileURLToPath } from 'url';

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    resolve: {
      alias: {
        '@/': fileURLToPath(new URL('./src/', import.meta.url))
      }
    }
  }),
  modules: ['@wxt-dev/module-react'],
  manifest: {
    default_locale: 'en',
    name: 'AI ProofDuck',
    description: 'AI-powered proofreading and translation extension',
    icons: {
      '16': 'icon/icon-16.png',
      '32': 'icon/icon-32.png',
      '48': 'icon/icon-48.png',
      '96': 'icon/icon-96.png',
      '128': 'icon/icon-128.png',
    },
  },
});
