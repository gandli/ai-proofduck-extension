import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from '../worker-utils';
import { TONE_MAP, DETAIL_MAP, PROMPTS, BASE_CONSTRAINT, SUFFIX_CONSTRAINT } from '../prompts';

const MODES = ['translate', 'summarize', 'expand', 'rewrite', 'proofread'];
const TONES = Object.keys(TONE_MAP);
const DETAILS = Object.keys(DETAIL_MAP);

describe('Feature: getSystemPrompt', () => {
  describe('Scenario: Mode Validation', () => {
    it('Given all modes When getting prompt Then should generate correct prompt for each', () => {
      MODES.forEach(mode => {
        const prompt = getSystemPrompt(mode, 'neutral', 'medium');
        expect(prompt).toContain(PROMPTS[mode]);
      });
    });

    it('Given unknown mode When getting prompt Then should use fallback', () => {
      const prompt = getSystemPrompt('unknown', 'neutral', 'medium');
      expect(prompt).toContain('Please process the following text');
    });
  });

  describe('Scenario: Tone Replacement', () => {
    it('Given all tones When getting prompt Then should replace {tone} with correct value', () => {
      MODES.forEach(mode => {
        TONES.forEach(tone => {
          const prompt = getSystemPrompt(mode, tone, 'medium');
          expect(prompt).toContain(TONE_MAP[tone]);
        });
      });
    });
  });

  describe('Scenario: Detail Replacement', () => {
    it('Given all details When getting prompt Then should replace {detail} with correct value', () => {
      MODES.forEach(mode => {
        DETAILS.forEach(detail => {
          const prompt = getSystemPrompt(mode, 'neutral', detail);
          expect(prompt).toContain(DETAIL_MAP[detail]);
        });
      });
    });
  });

  describe('Scenario: Constraint Inclusion', () => {
    it('Given any prompt When getting Then should include BASE_CONSTRAINT', () => {
      MODES.forEach(mode => {
        const prompt = getSystemPrompt(mode, 'neutral', 'medium');
        expect(prompt).toContain(BASE_CONSTRAINT);
      });
    });

    it('Given any prompt When getting Then should include SUFFIX_CONSTRAINT', () => {
      MODES.forEach(mode => {
        const prompt = getSystemPrompt(mode, 'neutral', 'medium');
        expect(prompt).toContain(SUFFIX_CONSTRAINT);
      });
    });
  });
});