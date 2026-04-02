import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/unit/**'],
    exclude: ['node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/types/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './test-coverage',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@entry': path.resolve(__dirname, 'entrypoints'),
      '@mlc-ai/web-llm': path.resolve(__dirname, 'tests/__mocks__/@mlc-ai/web-llm.ts'),
      '@huggingface/transformers': path.resolve(__dirname, 'tests/__mocks__/@huggingface/transformers.ts'),
    },
  },
  // Mark external modules that should not be processed
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm', '@huggingface/transformers'],
  },
  define: {
    'import.meta.env': {},
  },
});
