import { vi } from 'vitest';

// Mock the global browser object
const browserMock = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    onInstalled: {
      addListener: vi.fn(),
    },
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    sendMessage: vi.fn(() => Promise.resolve()),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  sidePanel: {
    setPanelBehavior: vi.fn(),
    open: vi.fn(),
  },
  offscreen: {
    createDocument: vi.fn(),
    Reason: { LOCAL_STORAGE: 'LOCAL_STORAGE' },
  },
};

// Assign to global
(globalThis as any).browser = browserMock;
(globalThis as any).chrome = browserMock;

// Mock defineBackground and defineContentScript from wxt/client (or just as pass-throughs)
(globalThis as any).defineBackground = (cb: any) => cb();
(globalThis as any).defineContentScript = (config: any) => config;

// Mock other globals if needed
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
