import { defineConfig } from 'wxt';
import path from 'node:path';
import url from 'node:url';

const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(url.fileURLToPath(import.meta.url));

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    resolve: {
      alias: {
        '@/': path.resolve(_dirname, './src') + '/'
      }
    }
  }),
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
