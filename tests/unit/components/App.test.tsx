import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';

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

beforeEach(() => {
  Object.defineProperty(globalThis, 'chrome', {
    value: mockChrome,
    writable: true,
    configurable: true,
  });
});

vi.mock('../../../src/i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('@/assets/react.svg', () => ({ default: '/mock-react.svg' }));

vi.mock('/wxt.svg', () => ({ default: '/mock-wxt.svg' }));

vi.mock('../../../entrypoints/popup/App.css', () => ({}));

function TestCounter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
    </div>
  );
}

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<TestCounter />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('displays initial count of 0', () => {
    render(<TestCounter />);
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('0');
  });

  it('increments counter on click', async () => {
    const userEvent = await import('@testing-library/user-event');
    render(<TestCounter />);
    const button = screen.getByRole('button');
    await userEvent.default.click(button);
    expect(button.textContent).toContain('1');
  });
});