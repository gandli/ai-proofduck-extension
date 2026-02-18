import { describe, it, expect } from 'vitest';
import { TONE_MAP, DETAIL_MAP, PROMPTS, BASE_CONSTRAINT, SUFFIX_CONSTRAINT } from '../prompts';

describe('Feature: Prompts System', () => {
  describe('Scenario: TONE_MAP Validation', () => {
    it('Given TONE_MAP When checking structure Then should have 4 tones', () => {
      expect(Object.keys(TONE_MAP)).toHaveLength(4);
    });
  });

  describe('Scenario: DETAIL_MAP Validation', () => {
    it('Given DETAIL_MAP When checking structure Then should have 3 detail levels', () => {
      expect(Object.keys(DETAIL_MAP)).toHaveLength(3);
    });
  });

  describe('Scenario: PROMPTS Validation', () => {
    it('Given PROMPTS When checking structure Then should have 5 modes', () => {
      expect(Object.keys(PROMPTS)).toHaveLength(5);
    });

    it('Given PROMPTS When checking placeholders Then should contain {tone} and {detail}', () => {
      Object.values(PROMPTS).forEach(prompt => {
        expect(prompt).toContain('{tone}');
        expect(prompt).toContain('{detail}');
      });
    });
  });

  describe('Scenario: Constraint Validation', () => {
    it('Given BASE_CONSTRAINT When checking Then should not be empty', () => {
      expect(BASE_CONSTRAINT).not.toBe('');
    });

    it('Given SUFFIX_CONSTRAINT When checking Then should not be empty', () => {
      expect(SUFFIX_CONSTRAINT).not.toBe('');
    });
  });
});