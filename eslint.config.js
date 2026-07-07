import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * ESLint flat config
 *
 * 目标：本地和 Codacy 侧都能读到 TS 类型信息 + 保持类型安全。
 *
 * 关键点：
 * 1. tseslint.configs.recommendedTypeChecked —— 启用类型感知规则
 * 2. languageOptions.parserOptions.projectService = true —— tseslint v8+
 *    自动发现 tsconfig（wxt 生成 .wxt/tsconfig.json）
 * 3. 不再全局关掉 no-unsafe-* —— 保留类型安全（采纳 CodeRabbit review）
 * 4. no-misused-promises 只放宽 attributes（React onClick={async}），
 *    保留 arguments/returns 检查（采纳 CodeRabbit review）
 * 5. 测试文件放宽（fixtures/mocks 允许 any）
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
      // 采纳 CodeRabbit：细粒度关闭 checksVoidReturn.attributes（React onClick={async}）
      // 但保留 arguments/returns 检查，避免悬空 Promise
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksConditionals: true,
          checksVoidReturn: {
            attributes: false, // 允许 <button onClick={async () => ...}>
            arguments: true,
            returns: true,
            variables: true,
            properties: true,
          },
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // v0.5.6 P2-D（审计 v4）：生产代码强制显式处理 Promise
      // 允许显式 `void promise` 前缀跳过（用于 fire-and-forget 场景）
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreVoid: true, ignoreIIFE: true },
      ],
    },
  },
  {
    // src/ 里 chrome API 调用密集处：允许 no-unsafe-*（类型 shim 有时不完全）
    // 采纳 CodeRabbit：只对 entrypoints/ 和 chrome API 交互处放宽
    files: [
      'entrypoints/**/*.{ts,tsx}',
      'src/utils/permissions.ts',
      'src/core/message-bus.ts',
      'src/stores/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
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
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
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
      // no-var-requires 已弃用，用 no-require-imports（CodeRabbit review）
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
