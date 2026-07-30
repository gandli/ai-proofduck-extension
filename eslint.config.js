import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * ESLint flat config
 *
 * 因 typescript-eslint 8.x 不支持 TypeScript 7.0（内部硬封锁），
 * 切换到非类型感知规则集。类型安全由 `tsc --noEmit` 兜底。
 * 待 typescript-eslint 9.x 支持 TS7 后切回 recommendedTypeChecked。
 * 追踪: https://github.com/typescript-eslint/typescript-eslint/issues/10940
 */
export default tseslint.config(
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.wxt/',
      '.output/',
      'coverage/',
      'sketches/',
      'playwright-report/',
      'test-results/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        // DOM/BOM（@types/chrome + tsconfig.dom lib 提供 chrome/window 类型）
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        globalThis: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        // Node
        process: 'readonly',
        // Web extension global（wxt 注入）
        chrome: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // 测试和 e2e 文件更宽松
    files: [
      'tests/**/*.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/rules-of-order': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'require-yield': 'off',
      'no-empty': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
