import { describe, it, expect } from 'vitest';
import { translations } from '../i18n';

const EXPECTED_LANGUAGES = ['中文', 'English', '日本語', '한국어', 'Français', 'Deutsch', 'Español'];

describe('Feature: Internationalization', () => {
  describe('Scenario: Language Existence', () => {
    it('Given translations When checking Then should have 7 languages', () => {
      expect(Object.keys(translations)).toHaveLength(7);
    });

    it.each(EXPECTED_LANGUAGES)('Given language "%s" When checking Then should exist', (lang) => {
      expect(translations).toHaveProperty(lang);
    });
  });

  describe('Scenario: Key Completeness', () => {
    const referenceKeys = Object.keys(translations['中文']).sort();

    it.each(EXPECTED_LANGUAGES)('Given language "%s" When checking keys Then should have all keys from 中文', (lang) => {
      const langKeys = Object.keys(translations[lang]).sort();
      expect(langKeys).toEqual(referenceKeys);
    });

    it('Given engine_chrome_ai When checking Then should exist in all languages', () => {
      for (const lang of EXPECTED_LANGUAGES) {
        expect(translations[lang]).toHaveProperty('engine_chrome_ai');
        expect(translations[lang].engine_chrome_ai.length).toBeGreaterThan(0);
      }
    });

    it('Given status_ready_chrome_ai When checking Then should exist in all languages', () => {
      for (const lang of EXPECTED_LANGUAGES) {
        expect(translations[lang]).toHaveProperty('status_ready_chrome_ai');
      }
    });
  });

  describe('Scenario: Key Consistency', () => {
    it('Given all languages When comparing Then should have identical key sets', () => {
      const refKeys = new Set(Object.keys(translations['中文']));
      for (const lang of EXPECTED_LANGUAGES) {
        const langKeys = new Set(Object.keys(translations[lang]));
        const missing = [...refKeys].filter(k => !langKeys.has(k));
        const extra = [...langKeys].filter(k => !refKeys.has(k));
        expect(missing, `${lang} missing keys`).toEqual([]);
        expect(extra, `${lang} extra keys`).toEqual([]);
      }
    });
  });

  describe('Scenario: Non-empty Values', () => {
    it.each(EXPECTED_LANGUAGES)('Given language "%s" When checking values Then should not have empty strings', (lang) => {
      for (const [key, val] of Object.entries(translations[lang])) {
        expect(val, `${lang}.${key} is empty`).not.toBe('');
      }
    });
  });
});
