import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    exclude: ['tests/e2e/**', 'node_modules/**'],
    setupFiles: ['./entrypoints/sidepanel/__tests__/setup.ts'],
    globals: true,
  },
});
