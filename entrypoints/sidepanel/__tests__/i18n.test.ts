import { describe, it, expect } from 'vitest';
import { i18n } from '../i18n';

const LANGUAGES = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr'];
const REQUIRED_KEYS = [
  'app_title',
  'mode_translate',
  'mode_summarize',
  'mode_expand',
  'mode_rewrite',
  'mode_proofread',
  'result_translate',
  'result_summarize',
  'result_expand',
  'result_rewrite',
  'result_proofread',
  'engine_online',
  'engine_local_gpu',
  'engine_local_wasm',
  'engine_chrome_ai',
  'tone_neutral',
  'tone_formal',
  'tone_casual',
  'tone_friendly',
  'detail_concise',
  'detail_medium',
  'detail_detailed',
  'button_execute',
  'button_clear',
  'button_copy',
  'button_settings',
  'placeholder_input',
  'error_no_api_key',
  'error_engine_not_ready',
  'error_network',
  'error_unknown',
  'settings_title',
  'settings_engine',
  'settings_api_key',
  'settings_language',
  'settings_tone',
  'settings_detail',
  'settings_auto_speak',
  'settings_local_model',
  'wasm_warning',
  'character_count'
];

describe('Feature: Internationalization', () => {
  describe('Scenario: Language Existence', () => {
    it('Given i18n When checking Then should have 7 languages', () => {
      expect(Object.keys(i18n)).toHaveLength(7);
    });

    it('Given each language When checking Then should exist', () => {
      LANGUAGES.forEach(lang => {
        expect(i18n).toHaveProperty(lang);
      });
    });
  });

  describe('Scenario: Key Completeness', () => {
    it('Given each language When checking keys Then should have all required keys', () => {
      LANGUAGES.forEach(lang => {
        REQUIRED_KEYS.forEach(key => {
          expect(i18n[lang]).toHaveProperty(key);
        });
      });
    });

    it('Given engine_chrome_ai When checking Then should exist in all languages', () => {
      LANGUAGES.forEach(lang => {
        expect(i18n[lang]).toHaveProperty('engine_chrome_ai');
      });
    });
  });

  describe('Scenario: Key Consistency', () => {
    it('Given all languages When comparing Then should have same key sets', () => {
      const keySets = LANGUAGES.map(lang => new Set(Object.keys(i18n[lang])));
      const firstSet = keySets[0];
      keySets.forEach(set => {
        expect(set.size).toBe(firstSet.size);
        set.forEach(key => {
          expect(firstSet.has(key)).toBe(true);
        });
      });
    });
  });

  describe('Scenario: Non-empty Values', () => {
    it('Given all translations When checking Then should not have empty strings', () => {
      LANGUAGES.forEach(lang => {
        Object.values(i18n[lang]).forEach(value => {
          expect(value).not.toBe('');
        });
      });
    });
  });
});