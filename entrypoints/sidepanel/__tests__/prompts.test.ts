import { describe, it, expect } from 'vitest';
import { TONE_MAP, DETAIL_MAP, PROMPTS, BASE_CONSTRAINT, SUFFIX_CONSTRAINT } from '../prompts';

describe('Feature: Prompts System', () => {
  describe('Scenario: TONE_MAP Validation', () => {
    it('Given TONE_MAP When checking Then should have 4 tones', () => {
      expect(Object.keys(TONE_MAP)).toHaveLength(4);
      expect(TONE_MAP).toHaveProperty('professional');
      expect(TONE_MAP).toHaveProperty('casual');
      expect(TONE_MAP).toHaveProperty('academic');
      expect(TONE_MAP).toHaveProperty('concise');
    });

    it('Given each tone When checking Then should be non-empty Chinese string', () => {
      for (const val of Object.values(TONE_MAP)) {
        expect(val.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Scenario: DETAIL_MAP Validation', () => {
    it('Given DETAIL_MAP When checking Then should have 3 detail levels', () => {
      expect(Object.keys(DETAIL_MAP)).toHaveLength(3);
      expect(DETAIL_MAP).toHaveProperty('standard');
      expect(DETAIL_MAP).toHaveProperty('detailed');
      expect(DETAIL_MAP).toHaveProperty('creative');
    });
  });

  describe('Scenario: PROMPTS Validation', () => {
    it('Given PROMPTS When checking Then should have 5 modes', () => {
      expect(Object.keys(PROMPTS)).toHaveLength(5);
      expect(PROMPTS).toHaveProperty('summarize');
      expect(PROMPTS).toHaveProperty('correct');
      expect(PROMPTS).toHaveProperty('proofread');
      expect(PROMPTS).toHaveProperty('translate');
      expect(PROMPTS).toHaveProperty('expand');
    });

    it('Given proofread/translate prompts When checking Then should contain {tone}', () => {
      expect(PROMPTS.proofread).toContain('{tone}');
      expect(PROMPTS.translate).toContain('{tone}');
    });

    it('Given expand prompt When checking Then should contain {detail}', () => {
      expect(PROMPTS.expand).toContain('{detail}');
    });

    it('Given summarize/correct prompts When checking Then should not have placeholders', () => {
      expect(PROMPTS.summarize).not.toContain('{tone}');
      expect(PROMPTS.summarize).not.toContain('{detail}');
      expect(PROMPTS.correct).not.toContain('{tone}');
      expect(PROMPTS.correct).not.toContain('{detail}');
    });

    it('Given each prompt When checking Then should be non-empty', () => {
      for (const val of Object.values(PROMPTS)) {
        expect(val.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Scenario: Constraints', () => {
    it('Given BASE_CONSTRAINT When checking Then should contain prohibition keywords', () => {
      expect(BASE_CONSTRAINT).toContain('禁止');
    });

    it('Given SUFFIX_CONSTRAINT When checking Then should contain output instruction', () => {
      expect(SUFFIX_CONSTRAINT).toContain('严禁');
    });
  });
});
