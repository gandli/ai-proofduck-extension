import { describe, it, expect } from 'vitest';
import { ModeKey, Settings, DEFAULT_SETTINGS, emptyModeResults, emptyGeneratingModes, MODES } from '../types';

describe('Feature: Types and Constants', () => {
  describe('Scenario: ModeKey Validation', () => {
    it('Given ModeKey When checking values Then should have 5 modes', () => {
      expect(Object.values(ModeKey)).toHaveLength(5);
    });
  });

  describe('Scenario: Settings Validation', () => {
    it('Given Settings When checking structure Then should have all required fields', () => {
      const settings: Settings = {
        engine: 'online',
        apiKey: 'test-key',
        language: 'en',
        tone: 'neutral',
        detail: 'medium',
        autoSpeak: false,
        localModel: 'default'
      };
      expect(settings).toHaveProperty('engine');
      expect(settings).toHaveProperty('apiKey');
      expect(settings).toHaveProperty('language');
      expect(settings).toHaveProperty('tone');
      expect(settings).toHaveProperty('detail');
      expect(settings).toHaveProperty('autoSpeak');
      expect(settings).toHaveProperty('localModel');
    });
  });

  describe('Scenario: DEFAULT_SETTINGS Validation', () => {
    it('Given DEFAULT_SETTINGS When checking Then should match expected structure', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        engine: 'online',
        apiKey: '',
        language: 'en',
        tone: 'neutral',
        detail: 'medium',
        autoSpeak: false,
        localModel: 'default'
      });
    });
  });

  describe('Scenario: emptyModeResults Validation', () => {
    it('Given emptyModeResults When called Then should return array of 5 empty strings', () => {
      const results = emptyModeResults();
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe('');
      });
    });
  });

  describe('Scenario: emptyGeneratingModes Validation', () => {
    it('Given emptyGeneratingModes When called Then should return array of 5 false values', () => {
      const generatingModes = emptyGeneratingModes();
      expect(generatingModes).toHaveLength(5);
      generatingModes.forEach(mode => {
        expect(mode).toBe(false);
      });
    });
  });

  describe('Scenario: MODES Validation', () => {
    it('Given MODES When checking Then should have 5 items with required properties', () => {
      expect(MODES).toHaveLength(5);
      MODES.forEach(mode => {
        expect(mode).toHaveProperty('key');
        expect(mode).toHaveProperty('labelKey');
        expect(mode).toHaveProperty('resultLabelKey');
      });
    });
  });
});