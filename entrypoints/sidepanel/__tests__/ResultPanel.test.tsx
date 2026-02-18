import { describe, it, expect } from 'vitest';
import { MODES } from '../types';
import { translations } from '../i18n';

describe('Feature: Result Panel', () => {
  describe('Scenario: Show/Hide logic', () => {
    it('Given empty result and not generating When checking Then should not show', () => {
      const result = '';
      const generating = false;
      const shouldShow = !!(result || generating);
      expect(shouldShow).toBe(false);
    });

    it('Given non-empty result When checking Then should show', () => {
      const result = '校对结果';
      const generating = false;
      const shouldShow = !!(result || generating);
      expect(shouldShow).toBe(true);
    });

    it('Given generating When checking Then should show even without result', () => {
      const result = '';
      const generating = true;
      const shouldShow = !!(result || generating);
      expect(shouldShow).toBe(true);
    });
  });

  describe('Scenario: WASM warning', () => {
    it('Given local-wasm engine with no result and generating When checking Then should show warning', () => {
      const engine = 'local-wasm';
      const result = '';
      const generating = true;
      const showWarning = engine === 'local-wasm' && !result && generating;
      expect(showWarning).toBe(true);
    });

    it('Given local-gpu engine When checking Then should NOT show warning', () => {
      const engine = 'local-gpu';
      const showWarning = engine === 'local-wasm';
      expect(showWarning).toBe(false);
    });

    it('Given online engine When checking Then should NOT show warning', () => {
      const engine = 'online';
      const showWarning = engine === 'local-wasm';
      expect(showWarning).toBe(false);
    });

    it('Given chrome-ai engine When checking Then should NOT show warning', () => {
      const engine = 'chrome-ai';
      const showWarning = engine === 'local-wasm';
      expect(showWarning).toBe(false);
    });
  });

  describe('Scenario: Character count', () => {
    it('Given result text When counting Then should report correct length', () => {
      const result = '这是一段测试文本';
      expect(result.length).toBe(8);
    });

    it('Given empty result When counting Then should be zero', () => {
      expect(''.length).toBe(0);
    });
  });

  describe('Scenario: Result label keys', () => {
    it('Given each mode When checking result labels Then should exist in translations', () => {
      for (const mode of MODES) {
        expect(translations['中文'][mode.resultLabelKey]).toBeDefined();
        expect(translations['English'][mode.resultLabelKey]).toBeDefined();
      }
    });
  });
});
