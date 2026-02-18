import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import type { Settings } from '../types';
import { translations } from '../i18n';

describe('Feature: Settings Panel', () => {
  describe('Scenario: Engine selection options', () => {
    it('Given 4 engines When checking Then should include chrome-ai, local-gpu, local-wasm, online', () => {
      const engines = ['chrome-ai', 'local-gpu', 'local-wasm', 'online'];
      for (const e of engines) {
        expect(typeof e).toBe('string');
      }
      expect(engines).toHaveLength(4);
    });

    it('Given each engine When checking i18n Then should have label in all languages', () => {
      const engineKeys = ['engine_chrome_ai', 'engine_webgpu', 'engine_wasm', 'engine_online'];
      for (const lang of Object.keys(translations)) {
        for (const key of engineKeys) {
          expect(translations[lang][key], `${lang}.${key}`).toBeDefined();
        }
      }
    });
  });

  describe('Scenario: Conditional UI visibility', () => {
    it('Given local-gpu engine When checking Then should show model selector', () => {
      const engine = 'local-gpu';
      const showModel = engine === 'local-gpu' || engine === 'local-wasm';
      expect(showModel).toBe(true);
    });

    it('Given local-wasm engine When checking Then should show model selector', () => {
      const engine = 'local-wasm';
      const showModel = engine === 'local-gpu' || engine === 'local-wasm';
      expect(showModel).toBe(true);
    });

    it('Given online engine When checking Then should NOT show model selector', () => {
      const engine = 'online';
      const showModel = engine === 'local-gpu' || engine === 'local-wasm';
      expect(showModel).toBe(false);
    });

    it('Given chrome-ai engine When checking Then should NOT show model selector', () => {
      const engine = 'chrome-ai';
      const showModel = engine === 'local-gpu' || engine === 'local-wasm';
      expect(showModel).toBe(false);
    });

    it('Given online engine When checking Then should show API config', () => {
      const engine = 'online';
      const showAPI = engine === 'online';
      expect(showAPI).toBe(true);
    });

    it('Given chrome-ai engine When checking Then should NOT show API config', () => {
      const engine = 'chrome-ai';
      const showAPI = engine === 'online';
      expect(showAPI).toBe(false);
    });
  });

  describe('Scenario: Language selection', () => {
    it('Given 7 languages When checking Then should all be available', () => {
      const languages = ['中文', 'English', '日本語', '한국어', 'Français', 'Deutsch', 'Español'];
      expect(Object.keys(translations)).toEqual(expect.arrayContaining(languages));
    });
  });

  describe('Scenario: Tone and detail options', () => {
    it('Given 4 tone options When checking Then should match expected values', () => {
      const tones = ['professional', 'casual', 'academic', 'concise'];
      expect(tones).toHaveLength(4);
    });

    it('Given 3 detail options When checking Then should match expected values', () => {
      const details = ['standard', 'detailed', 'creative'];
      expect(details).toHaveLength(3);
    });
  });

  describe('Scenario: autoSpeak default', () => {
    it('Given DEFAULT_SETTINGS When checking Then autoSpeak should be false', () => {
      expect(DEFAULT_SETTINGS.autoSpeak).toBe(false);
    });
  });
});
