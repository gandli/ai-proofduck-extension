// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultPanel } from '../components/ResultPanel';
import { ModeSelector } from '../components/ModeSelector';
import { translations } from '../i18n';

// Mocks
const t = translations['English'];

describe('Feature: Accessibility', () => {
  describe('Component: ResultPanel', () => {
    it('Given a result When rendered Then copy button should have aria-label', () => {
      render(
        <ResultPanel
          mode="summarize"
          modeResults={{ summarize: 'Result text', correct: '', proofread: '', translate: '', expand: '' }}
          setModeResults={vi.fn()}
          generatingModes={{ summarize: false, correct: false, proofread: false, translate: false, expand: false }}
          status="idle"
          engine="local-gpu"
          t={t}
        />
      );

      // We look for button with aria-label matching t.copy_btn
      const copyButton = screen.getByLabelText(t.copy_btn);
      expect(copyButton).toBeDefined();
    });
  });

  describe('Component: ModeSelector', () => {
    it('Given normal state When rendered Then settings button should have aria-label', () => {
      render(
        <ModeSelector
          mode="summarize"
          setMode={vi.fn()}
          t={t}
          onOpenSettings={vi.fn()}
        />
      );

      const settingsButton = screen.getByLabelText(t.settings);
      expect(settingsButton).toBeDefined();
    });
  });
});
