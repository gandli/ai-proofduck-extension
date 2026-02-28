// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ModeSelector } from '../components/ModeSelector';
import { ResultPanel } from '../components/ResultPanel';
import { memo } from 'react';

// Mock chrome/browser API for App rendering
global.browser = {
  runtime: {
    getURL: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn(),
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(),
  },
  i18n: {
    getMessage: vi.fn((key) => key),
  },
} as any;

global.chrome = global.browser;

describe('Component Optimization Checks', () => {
  it('ModeSelector should be memoized', () => {
    // React.memo adds a $$typeof property with Symbol.for('react.memo')
    const isMemoized = (ModeSelector as any).$$typeof === Symbol.for('react.memo');
    expect(isMemoized).toBe(true);
  });

  it('ResultPanel should be memoized', () => {
    const isMemoized = (ResultPanel as any).$$typeof === Symbol.for('react.memo');
    expect(isMemoized).toBe(true);
  });
});
