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
    const coreKeys = [
      'settings',
      'mode_translate',
      'mode_summarize',
      'mode_correct',
      'mode_proofread',
      'mode_expand',
      'engine_chrome_ai',
      'engine_webgpu',
      'engine_wasm',
      'engine_online',
      'fetch_page_content',
    ];

    it.each(EXPECTED_LANGUAGES)('Given language "%s" When checking core keys Then should contain required keys', (lang) => {
      for (const key of coreKeys) {
        expect(translations[lang], `${lang} missing ${key}`).toHaveProperty(key);
      }
    });

    it('Given translate-first keys When checking Then should exist in zh/en', () => {
      for (const lang of ['中文', 'English']) {
        expect(translations[lang]).toHaveProperty('translate_full_page');
        expect(translations[lang]).toHaveProperty('translate_full_page_short');
        expect(translations[lang]).toHaveProperty('translate_fallback_label');
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
