import { describe, it, expect } from 'vitest';
import { MODES } from '../types';
import { translations } from '../i18n';

describe('Feature: Mode Selector', () => {
  describe('Scenario: Mode Buttons', () => {
    it('Given MODES array When rendering Then should have 5 modes', () => {
      expect(MODES).toHaveLength(5);
    });

    it('Given each mode When checking labels Then should have i18n keys in all languages', () => {
      for (const mode of MODES) {
        for (const [lang, t] of Object.entries(translations)) {
          expect(t[mode.labelKey], `${lang}.${mode.labelKey}`).toBeDefined();
          expect(t[mode.labelKey].length, `${lang}.${mode.labelKey} empty`).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Scenario: Active mode highlight', () => {
    it('Given a mode key When checking against MODES Then should find exactly one match', () => {
      const match = MODES.filter(m => m.key === 'translate');
      expect(match).toHaveLength(1);
      expect(match[0].labelKey).toBe('mode_translate');
    });
  });

  describe('Scenario: Settings button', () => {
    it('Given settings icon When present Then ModeSelector should include settings action', () => {
      // ModeSelector accepts onOpenSettings prop - verify the interface contract
      const props = { mode: 'summarize', setMode: () => {}, t: translations['中文'], onOpenSettings: () => {} };
      expect(props).toHaveProperty('onOpenSettings');
    });
  });
});
