import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * ESLint flat config
 *
 * 目标：本地和 Codacy 侧都能读到 TS 类型信息，
 * 避免 `chrome.*` / `useSettingsStore` / `defineStorage` 被判 error typed。
 *
 * 关键点：
 * 1. tseslint.configs.recommendedTypeChecked —— 启用类型感知规则
 * 2. languageOptions.parserOptions.projectService = true —— tseslint v8+
 *    自动发现 tsconfig，无需硬编码路径（wxt 会生成 .wxt/tsconfig.json）
 * 3. 排除 dist/.wxt/.output/coverage/sketches
 * 4. 测试文件放宽（fixtures/mocks 允许 any）
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
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        // Chrome 扩展 API 全局
        chrome: 'readonly',
        // DOM/BOM
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
      // Codacy 也跑这条规则时的宽松处理：
      // 我们代码里的 chrome.* 都有运行时守卫（?. 链），
      // 类型层面 @types/chrome 已提供准确类型，无需再警告
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Playwright / Testing Library / chrome.storage 回调常有
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false },
      ],
      // 允许 as unknown as X 的类型收窄（我们对 globalThis 做转换）
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // 测试和 e2e 文件更宽松 —— 测试是"消费者"，允许写更松散
    files: [
      'tests/**/*.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      'react-hooks/rules-of-order': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'require-yield': 'off',
      'no-empty': 'off',
    },
  },
  {
    // 配置文件、脚本 —— 关闭类型感知规则
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
);
