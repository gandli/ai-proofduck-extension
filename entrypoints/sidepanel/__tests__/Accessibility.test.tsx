// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModeSelector } from '../components/ModeSelector';
import { ResultPanel } from '../components/ResultPanel';
import { ModeKey } from '../types';

describe('Accessibility Checks', () => {
  const mockT: Record<string, string> = {
    settings: 'Settings',
    copy_btn: 'Copy',
    summarize: 'Summarize',
    correct: 'Correct',
    proofread: 'Proofread',
    translate: 'Translate',
    expand: 'Expand',
    result_summarize: 'Summary:',
    result_correct: 'Correction:',
    result_proofread: 'Suggestions:',
    result_translate: 'Translation:',
    result_expand: 'Expansion:',
  };

  describe('ModeSelector', () => {
    it('Settings button has accessible label', () => {
      render(
        <ModeSelector
          mode="summarize"
          setMode={vi.fn()}
          t={mockT}
          onOpenSettings={vi.fn()}
        />
      );

      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      expect(settingsButton).toBeDefined();
      expect(settingsButton.getAttribute('aria-label')).toBe('Settings');
    });
  });

  describe('ResultPanel', () => {
    it('Copy button has accessible label', () => {
      const modeResults = {
        summarize: 'Result Text',
        correct: '',
        proofread: '',
        translate: '',
        expand: ''
      };

      const generatingModes = {
        summarize: false,
        correct: false,
        proofread: false,
        translate: false,
        expand: false
      };

      render(
        <ResultPanel
          mode="summarize"
          modeResults={modeResults}
          setModeResults={vi.fn()}
          generatingModes={generatingModes}
          status="ready"
          engine="local-gpu"
          t={mockT}
        />
      );

      const copyButton = screen.getByRole('button', { name: 'Copy' });
      expect(copyButton).toBeDefined();
      expect(copyButton.getAttribute('aria-label')).toBe('Copy');
    });
  });
});
