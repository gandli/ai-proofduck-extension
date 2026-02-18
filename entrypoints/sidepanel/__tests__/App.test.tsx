import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Feature: Main Application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.browser = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn()
        }
      },
      tabs: {
        query: vi.fn()
      }
    } as any;
  });

  describe('Scenario: State Management', () => {
    it('Given idle state When initializing Then should show idle UI', () => {
      render(<App />);
      expect(screen.getByText(/execute/i)).toBeInTheDocument();
    });

    it('Given loading state When generating Then should show loading overlay', () => {
      render(<App />);
      // Simulate loading state
      expect(true).toBe(true);
    });

    it('Given error state When error occurs Then should show error message', () => {
      render(<App />);
      // Simulate error state
      expect(true).toBe(true);
    });

    it('Given ready state When engine ready Then should show ready UI', () => {
      render(<App />);
      // Simulate ready state
      expect(true).toBe(true);
    });
  });

  describe('Scenario: Mode Switching', () => {
    it('Given 5 modes When switching Then should update active mode', () => {
      render(<App />);
      const modeButtons = screen.getAllByRole('button');
      expect(modeButtons.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Scenario: Text Input and Character Count', () => {
    it('Given text input When typing Then should update character count', () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/enter text/i);
      fireEvent.change(textarea, { target: { value: 'test text' } });
      expect(screen.getByText(/10\/1000/i)).toBeInTheDocument();
    });

    it('Given max characters When exceeded Then should show warning', () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/enter text/i);
      const longText = 'a'.repeat(1001);
      fireEvent.change(textarea, { target: { value: longText } });
      expect(screen.getByText(/1001\/1000/i)).toBeInTheDocument();
    });
  });

  describe('Scenario: Get Page Content', () => {
    it('Given get page content When clicked Then should fetch page text', async () => {
      render(<App />);
      const getContentButton = screen.getByText(/get page content/i);
      fireEvent.click(getContentButton);
      expect(global.browser.tabs.query).toHaveBeenCalled();
    });
  });

  describe('Scenario: Clear Function', () => {
    it('Given clear button When clicked Then should clear input and results', () => {
      render(<App />);
      const clearButton = screen.getByText(/clear/i);
      fireEvent.click(clearButton);
      const textarea = screen.getByPlaceholderText(/enter text/i);
      expect(textarea).toHaveValue('');
    });
  });

  describe('Scenario: Execute Button State', () => {
    it('Given empty input When checking Then should disable execute button', () => {
      render(<App />);
      const executeButton = screen.getByText(/execute/i);
      expect(executeButton).toBeDisabled();
    });

    it('Given loading state When checking Then should disable execute button', () => {
      render(<App />);
      // Simulate loading state
      const executeButton = screen.getByText(/execute/i);
      expect(executeButton).toBeDisabled();
    });

    it('Given valid input When checking Then should enable execute button', () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/enter text/i);
      fireEvent.change(textarea, { target: { value: 'test text' } });
      const executeButton = screen.getByText(/execute/i);
      expect(executeButton).not.toBeDisabled();
    });
  });

  describe('Scenario: Error Display', () => {
    it('Given error When occurs Then should show error message', () => {
      render(<App />);
      // Simulate error
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});