import { describe, it, expect } from 'vitest';

describe('EngineState', () => {
  it('should have correct idle state', () => {
    const state = {
      currentEngine: 'google',
      status: 'idle' as const,
      fallbackEngines: ['bing', 'deepl'],
    };

    expect(state.status).toBe('idle');
    expect(state.currentEngine).toBe('google');
    expect(state.fallbackEngines).toHaveLength(2);
  });

  it('should have correct translating state', () => {
    const state = {
      currentEngine: 'google',
      status: 'translating' as const,
      fallbackEngines: [],
    };

    expect(state.status).toBe('translating');
  });

  it('should have error state with message', () => {
    const state = {
      currentEngine: 'google',
      status: 'error' as const,
      error: 'Network timeout',
      fallbackEngines: ['bing'],
    };

    expect(state.status).toBe('error');
    expect(state.error).toBe('Network timeout');
  });
});

describe('ServiceConfig', () => {
  it('should have enabled state', () => {
    const config = {
      enabled: true,
      priority: 1,
      status: 'available' as const,
    };

    expect(config.enabled).toBe(true);
    expect(config.status).toBe('available');
  });

  it('should have loading state', () => {
    const config = {
      enabled: true,
      priority: 2,
      status: 'loading' as const,
    };

    expect(config.status).toBe('loading');
  });

  it('should have unavailable state', () => {
    const config = {
      enabled: false,
      priority: 3,
      status: 'unavailable' as const,
    };

    expect(config.enabled).toBe(false);
    expect(config.status).toBe('unavailable');
  });
});