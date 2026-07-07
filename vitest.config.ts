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
      // 覆盖率现在把 entrypoints/ 3 大 App 组件（SidePanelApp/PopupApp/OptionsApp）也纳入分母
      // 排除仅做挂载 / WXT 生命周期的边界文件（无业务分支可测）
      include: ['src/**/*.{ts,tsx}', 'entrypoints/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        // 纯类型定义文件，无运行时代码
        'src/engines/types.ts',
        // 挂载入口：只调 createRoot(...).render(<App />)，无业务分支
        'entrypoints/*/main.tsx',
        // background.ts / content.tsx：WXT 生命周期，e2e 覆盖
        'entrypoints/background.ts',
        'entrypoints/content.tsx',
      ],
      thresholds: {
        // v0.4.2 审计后调整（P1-3）：include 从 `src/` 扩到 `src/ + entrypoints/`
        // SidePanelApp 有大量 pd-plush-* 装饰 DOM / StreamingParagraph 卡片布局分支
        // 是纯 UI 无逻辑分支，追进去只能写快照测（低价值），门槛校准到含 entrypoints 后的合理线
        // 目前实际：statements=92 / branches=85 / functions=87 / lines=94（含所有 3 大 App）
        statements: 90,
        branches: 85,
        functions: 85,
        lines: 92,
      },
    },
  },
});
