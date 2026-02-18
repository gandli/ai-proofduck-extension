import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, emptyModeResults, emptyGeneratingModes, MODES } from '../types';
import type { ModeKey } from '../types';

describe('Feature: Types and Constants', () => {
  describe('Scenario: ModeKey values via MODES array', () => {
    it('Given MODES When checking Then should have 5 modes', () => {
      expect(MODES).toHaveLength(5);
    });

    it('Given MODES When extracting keys Then should match expected mode keys', () => {
      const keys = MODES.map(m => m.key);
      expect(keys).toEqual(['summarize', 'correct', 'proofread', 'translate', 'expand']);
    });

    it('Given each MODE When checking Then should have key, labelKey, resultLabelKey', () => {
      for (const m of MODES) {
        expect(m).toHaveProperty('key');
        expect(m).toHaveProperty('labelKey');
        expect(m).toHaveProperty('resultLabelKey');
        expect(m.labelKey).toContain('mode_');
        expect(m.resultLabelKey).toContain('result_');
      }
    });
  });

  describe('Scenario: DEFAULT_SETTINGS', () => {
    it('Given DEFAULT_SETTINGS When checking Then should have all required fields', () => {
      expect(DEFAULT_SETTINGS.engine).toBe('local-gpu');
      expect(DEFAULT_SETTINGS.extensionLanguage).toBe('中文');
      expect(DEFAULT_SETTINGS.tone).toBe('professional');
      expect(DEFAULT_SETTINGS.detailLevel).toBe('standard');
      expect(DEFAULT_SETTINGS.localModel).toBe('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
      expect(DEFAULT_SETTINGS.apiBaseUrl).toBe('https://api.openai.com/v1');
      expect(DEFAULT_SETTINGS.apiKey).toBe('');
      expect(DEFAULT_SETTINGS.apiModel).toBe('gpt-3.5-turbo');
      expect(DEFAULT_SETTINGS.autoSpeak).toBe(false);
    });
  });

  describe('Scenario: emptyModeResults', () => {
    it('Given emptyModeResults When called Then should return record with 5 empty strings', () => {
      const results = emptyModeResults();
      expect(Object.keys(results)).toHaveLength(5);
      for (const v of Object.values(results)) {
        expect(v).toBe('');
      }
    });

    it('Given emptyModeResults When called twice Then should return independent objects', () => {
      const a = emptyModeResults();
      const b = emptyModeResults();
      a.summarize = 'test';
      expect(b.summarize).toBe('');
    });
  });

  describe('Scenario: emptyGeneratingModes', () => {
    it('Given emptyGeneratingModes When called Then should return record with 5 false values', () => {
      const modes = emptyGeneratingModes();
      expect(Object.keys(modes)).toHaveLength(5);
      for (const v of Object.values(modes)) {
        expect(v).toBe(false);
      }
    });

    it('Given emptyGeneratingModes When called twice Then should return independent objects', () => {
      const a = emptyGeneratingModes();
      const b = emptyGeneratingModes();
      a.summarize = true;
      expect(b.summarize).toBe(false);
    });
  });
});
