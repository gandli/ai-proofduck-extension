import { describe, it, expect } from 'vitest';

type Engine = 'chrome-ai' | 'local-gpu' | 'local-wasm' | 'online';
type Fallback = 'none' | 'google-free' | 'mymemory';

interface RouteInput {
  engine: Engine;
  mode: 'translate' | 'summarize' | 'correct' | 'proofread' | 'expand';
  hasApiKey: boolean;
  chromeAiAvailable: boolean;
  translateFallback: Fallback;
}

function decideRoute(input: RouteInput): 'chrome-ai' | 'background-worker' | 'translate-fallback' | 'error' {
  if (input.engine === 'chrome-ai') {
    if (input.chromeAiAvailable) return 'chrome-ai';
    if (input.mode === 'translate' && input.translateFallback !== 'none') return 'translate-fallback';
    return 'error';
  }

  if (input.engine === 'online') {
    if (input.mode === 'translate' && !input.hasApiKey && input.translateFallback !== 'none') {
      return 'translate-fallback';
    }
    return 'background-worker';
  }

  return 'background-worker';
}

describe('Feature: Translate-first routing strategy', () => {
  describe('Scenario: Chrome AI available', () => {
    it('Given chrome-ai engine and available runtime, When generating translate, Then route should use chrome-ai directly', () => {
      const route = decideRoute({
        engine: 'chrome-ai',
        mode: 'translate',
        hasApiKey: false,
        chromeAiAvailable: true,
        translateFallback: 'google-free',
      });
      expect(route).toBe('chrome-ai');
    });
  });

  describe('Scenario: Chrome AI unavailable with translate fallback enabled', () => {
    it('Given chrome-ai engine but unavailable runtime, When mode is translate, Then route should fallback to free translator', () => {
      const route = decideRoute({
        engine: 'chrome-ai',
        mode: 'translate',
        hasApiKey: false,
        chromeAiAvailable: false,
        translateFallback: 'mymemory',
      });
      expect(route).toBe('translate-fallback');
    });
  });

  describe('Scenario: Online engine without API key', () => {
    it('Given online engine and missing API key, When mode is translate, Then route should fallback if enabled', () => {
      const route = decideRoute({
        engine: 'online',
        mode: 'translate',
        hasApiKey: false,
        chromeAiAvailable: false,
        translateFallback: 'google-free',
      });
      expect(route).toBe('translate-fallback');
    });

    it('Given online engine and missing API key, When mode is summarize, Then route should stay background-worker', () => {
      const route = decideRoute({
        engine: 'online',
        mode: 'summarize',
        hasApiKey: false,
        chromeAiAvailable: false,
        translateFallback: 'google-free',
      });
      expect(route).toBe('background-worker');
    });
  });

  describe('Scenario: Fallback disabled', () => {
    it('Given chrome-ai unavailable and translate fallback disabled, When mode is translate, Then route should return error', () => {
      const route = decideRoute({
        engine: 'chrome-ai',
        mode: 'translate',
        hasApiKey: false,
        chromeAiAvailable: false,
        translateFallback: 'none',
      });
      expect(route).toBe('error');
    });
  });
});
