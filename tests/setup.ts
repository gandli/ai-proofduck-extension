import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock chrome API for tests
const mockChrome = {
  runtime: {
    id: 'test-extension-id',
    getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
    sendMessage: () => Promise.resolve({}),
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  i18n: {
    t: (key: string) => key,
    getUILanguage: () => 'en',
  },
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
};

// @ts-expect-error - global browser mock
globalThis.browser = mockChrome;
