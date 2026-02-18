import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from '../worker-utils';
import { TONE_MAP, DETAIL_MAP, BASE_CONSTRAINT, SUFFIX_CONSTRAINT } from '../prompts';

const baseSettings = {
  extensionLanguage: '中文',
  tone: 'professional',
  detailLevel: 'standard',
};

describe('Feature: getSystemPrompt', () => {
  describe('Scenario: Mode-specific prompts', () => {
    it.each(['summarize', 'correct', 'proofread', 'translate', 'expand'] as const)(
      'Given mode "%s" When generating prompt Then should contain mode-specific content',
      (mode) => {
        const prompt = getSystemPrompt(mode, baseSettings);
        expect(prompt.length).toBeGreaterThan(50);
        expect(prompt).toContain(BASE_CONSTRAINT);
        expect(prompt).toContain(SUFFIX_CONSTRAINT);
        expect(prompt).toContain('中文');
      },
    );

    it('Given unknown mode When generating prompt Then should fallback to proofread', () => {
      const prompt = getSystemPrompt('unknown_mode', baseSettings);
      expect(prompt).toContain('大厂资深文案编辑');
    });
  });

  describe('Scenario: Tone replacement', () => {
    it.each(Object.entries(TONE_MAP))(
      'Given tone "%s" When generating proofread prompt Then should contain "%s"',
      (toneKey, toneValue) => {
        const prompt = getSystemPrompt('proofread', { ...baseSettings, tone: toneKey });
        expect(prompt).toContain(toneValue);
      },
    );

    it.each(Object.entries(TONE_MAP))(
      'Given tone "%s" When generating translate prompt Then should contain "%s"',
      (toneKey, toneValue) => {
        const prompt = getSystemPrompt('translate', { ...baseSettings, tone: toneKey });
        expect(prompt).toContain(toneValue);
      },
    );
  });

  describe('Scenario: Detail replacement', () => {
    it.each(Object.entries(DETAIL_MAP))(
      'Given detail "%s" When generating expand prompt Then should contain "%s"',
      (detailKey, detailValue) => {
        const prompt = getSystemPrompt('expand', { ...baseSettings, detailLevel: detailKey });
        expect(prompt).toContain(detailValue);
      },
    );
  });

  describe('Scenario: Language targeting', () => {
    it.each(['English', '日本語', 'Français'])(
      'Given language "%s" When generating prompt Then should target that language',
      (lang) => {
        const prompt = getSystemPrompt('summarize', { ...baseSettings, extensionLanguage: lang });
        expect(prompt).toContain(lang);
      },
    );
  });

  describe('Scenario: Constraints always present', () => {
    it('Given any mode When generating Then should always include BASE_CONSTRAINT', () => {
      for (const mode of ['summarize', 'correct', 'proofread', 'translate', 'expand']) {
        expect(getSystemPrompt(mode, baseSettings)).toContain(BASE_CONSTRAINT);
      }
    });

    it('Given any mode When generating Then should always include SUFFIX_CONSTRAINT', () => {
      for (const mode of ['summarize', 'correct', 'proofread', 'translate', 'expand']) {
        expect(getSystemPrompt(mode, baseSettings)).toContain(SUFFIX_CONSTRAINT);
      }
    });
  });

  describe('Scenario: Edge cases', () => {
    it('Given empty settings When generating Then should use defaults', () => {
      const prompt = getSystemPrompt('summarize', {});
      expect(prompt).toContain('中文'); // default language
    });

    it('Given undefined tone When generating Then should fallback to professional', () => {
      const prompt = getSystemPrompt('proofread', { ...baseSettings, tone: undefined as any });
      expect(prompt).toContain(TONE_MAP.professional);
    });
  });
});
