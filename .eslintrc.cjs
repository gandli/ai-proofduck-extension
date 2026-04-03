/**
 * ESLint Configuration
 * @see https://eslint.org/docs/user-guide/configuring
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'tailwindcss'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'prettier',
    'plugin:tailwindcss/recommended',
  ],
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
  },
  globals: {
    chrome: 'readonly',
  },
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': ['error', {
      checksVoidReturn: { attributesEndingStatements: false },
    }],
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',

    // Style rules
    'capitalized-destructuring': 'off',
    'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
    'prefer-template': 'error',

    // Tailwind CSS
    'tailwindcss/no-custom-classname': 'off',
  },
  ignorePatterns: [
    'node_modules',
    '.output',
    '.wxt',
    'dist',
    'coverage',
    '.worktrees',
  ],
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['entrypoints/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off', // WXT handles this
      },
    },
  ],
};