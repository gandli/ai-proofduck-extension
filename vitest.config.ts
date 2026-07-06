import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';
import path from 'node:path';

// M1 单元测试配置：happy-dom + testing-library + WXT 插件（提供 chrome API mock）
export default defineConfig({
  plugins: [WxtVitest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@components': path.resolve(__dirname, './src/components'),
      '@engines': path.resolve(__dirname, './src/engines'),
      '@i18n': path.resolve(__dirname, './src/i18n'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', '.output/**'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
