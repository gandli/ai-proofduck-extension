import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultPanel from '../components/ResultPanel';

describe('Feature: Result Panel', () => {
  const mockOnCopy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.navigator.clipboard = {
      writeText: vi.fn()
    } as any;
  });

  describe('Scenario: Result Show/Hide Logic', () => {
    it('Given empty result When rendering Then should not show result panel', () => {
      render(<ResultPanel result="" onCopy={mockOnCopy} />);
      expect(screen.queryByText(/result/i)).not.toBeInTheDocument();
    });

    it('Given non-empty result When rendering Then should show result panel', () => {
      render(<ResultPanel result="test result" onCopy={mockOnCopy} />);
      expect(screen.getByText(/result/i)).toBeInTheDocument();
    });
  });

  describe('Scenario: Copy Function', () => {
    it('Given copy button When clicked Then should copy to clipboard', () => {
      render(<ResultPanel result="test result" onCopy={mockOnCopy} />);
      const copyButton = screen.getByText(/copy/i);
      fireEvent.click(copyButton);
      expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('test result');
    });

    it('Given copy button When clicked Then should trigger callback', () => {
      render(<ResultPanel result="test result" onCopy={mockOnCopy} />);
      const copyButton = screen.getByText(/copy/i);
      fireEvent.click(copyButton);
      expect(mockOnCopy).toHaveBeenCalled();
    });
  });

  describe('Scenario: WASM Warning', () => {
    it('Given WASM engine When rendering Then should show warning', () => {
      render(<ResultPanel result="test result" onCopy={mockOnCopy} engine="local-wasm" />);
      expect(screen.getByText(/wasm warning/i)).toBeInTheDocument();
    });

    it('Given non-WASM engine When rendering Then should not show warning', () => {
      render(<ResultPanel result="test result" onCopy={mockOnCopy} engine="online" />);
      expect(screen.queryByText(/wasm warning/i)).not.toBeInTheDocument();
    });
  });

  describe('Scenario: Character Count', () => {
    it('Given result text When rendering Then should show character count', () => {
      const result = 'test result with 25 characters';
      render(<ResultPanel result={result} onCopy={mockOnCopy} />);
      expect(screen.getByText(/25/i)).toBeInTheDocument();
    });
  });

  describe('Scenario: Generating State', () => {
    it('Given generating state When rendering Then should show loading indicator', () => {
      render(<ResultPanel result="" onCopy={mockOnCopy} isGenerating={true} />);
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it('Given not generating state When rendering Then should not show loading indicator', () => {
      render(<ResultPanel result="test" onCopy={mockOnCopy} isGenerating={false} />);
      expect(screen.queryByText(/generating/i)).not.toBeInTheDocument();
    });
  });
});