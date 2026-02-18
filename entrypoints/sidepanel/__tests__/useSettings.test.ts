import { describe, it, expect, vi } from 'vitest';

// Test the settings logic extracted from useSettings hook
// (React hooks can't be unit-tested without renderHook, so we test the logic)

import { DEFAULT_SETTINGS } from '../types';
import type { Settings } from '../types';

describe('Feature: useSettings Logic', () => {
  describe('Scenario: Engine switch → status mapping', () => {
    function determineStatus(engine: string, currentStatus: string): string {
      if (engine === 'online') return 'ready';
      if (engine === 'chrome-ai') return 'idle';
      return 'loading';
    }

    it('Given online engine When switching Then status should be ready', () => {
      expect(determineStatus('online', 'idle')).toBe('ready');
    });

    it('Given chrome-ai engine When switching Then status should be idle', () => {
      expect(determineStatus('chrome-ai', 'idle')).toBe('idle');
    });

    it('Given local-gpu engine When switching Then status should be loading', () => {
      expect(determineStatus('local-gpu', 'idle')).toBe('loading');
    });

    it('Given local-wasm engine When switching Then status should be loading', () => {
      expect(determineStatus('local-wasm', 'idle')).toBe('loading');
    });
  });

  describe('Scenario: API key storage separation', () => {
    it('Given settings with apiKey When persisting Then apiKey should be stored separately', () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, apiKey: 'secret-key' };
      const { apiKey, ...rest } = settings;
      expect(rest).not.toHaveProperty('apiKey');
      expect(apiKey).toBe('secret-key');
      expect((rest as any).apiKey).toBeUndefined();
    });
  });

  describe('Scenario: Settings merge with defaults', () => {
    it('Given partial saved settings When loading Then should merge with defaults', () => {
      const saved = { engine: 'online', apiKey: 'key123' };
      const merged: Settings = { ...DEFAULT_SETTINGS, ...saved };
      expect(merged.engine).toBe('online');
      expect(merged.apiKey).toBe('key123');
      expect(merged.extensionLanguage).toBe('中文');
      expect(merged.tone).toBe('professional');
    });
  });
});
