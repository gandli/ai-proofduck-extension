import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeSelector from '../components/ModeSelector';

describe('Feature: Mode Selector', () => {
  const mockOnModeChange = vi.fn();
  const mockOnSettingsClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scenario: Mode Buttons', () => {
    it('Given 5 modes When rendering Then should show 5 mode buttons', () => {
      render(<ModeSelector currentMode="translate" onModeChange={mockOnModeChange} onSettingsClick={mockOnSettingsClick} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(6); // 5 mode buttons + 1 settings button
    });

    it('Given each mode When rendering Then should have correct labels', () => {
      render(<ModeSelector currentMode="translate" onModeChange={mockOnModeChange} onSettingsClick={mockOnSettingsClick} />);
      expect(screen.getByText(/translate/i)).toBeInTheDocument();
      expect(screen.getByText(/summarize/i)).toBeInTheDocument();
      expect(screen.getByText(/expand/i)).toBeInTheDocument();
      expect(screen.getByText(/rewrite/i)).toBeInTheDocument();
      expect(screen.getByText(/proofread/i)).toBeInTheDocument();
    });
  });

  describe('Scenario: Current Mode Highlight', () => {
    it('Given translate mode When active Then should highlight translate button', () => {
      render(<ModeSelector currentMode="translate" onModeChange={mockOnModeChange} onSettingsClick={mockOnSettingsClick} />);
      const translateButton = screen.getByText(/translate/i);
      expect(translateButton).toHaveClass('active');
    });

    it('Given summarize mode When active Then should highlight summarize button', () => {
      render(<ModeSelector currentMode="summarize" onModeChange={mockOnModeChange} onSettingsClick={mockOnSettingsClick} />);
      const summarizeButton = screen.getByText(/summarize/i);
      expect(summarizeButton).toHaveClass('active');
    });

    it('Given non-active mode When rendering Then should not have active class', () => {
      render(<ModeSelector currentMode="translate" onModeChange={mockOnModeChange} onSettingsClick={mockOnSettingsClick} />);
      const summarizeButton = screen.getByText(/summarize/i);
      expect(summarizeButton).not.toHaveClass('active');
    });
  });

  describe('Scenario: Mode Change', () => {
    it('Given mode button click When triggered Then should call onModeChange', () => {
      render(<ModeSelector currentMode="translate" onModeChange={mockOnModeChange} onSettingsClick={mockOnSettingsClick} />);
      const summarizeButton = screen.getByText(/summarize/i);
      fireEvent.click(summarizeButton);
      expect(mockOnModeChange).toHaveBeenCalledWith('summarize');
    });

    it('Given same mode click When triggered Then should not call onModeChange', () => {
      render(<ModeSelector currentMode="translate" onModeChange={mockOnModeChange} onSettingsClick={mockOnSettingsClick} />);
      const translateButton = screen.getByText(/translate/i);
      fireEvent.click(translateButton);
      expect(mockOnModeChange).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Settings Button', () => {
    it('Given settings button When clicked Then should call onSettingsClick', () => {
      render(<ModeSelector currentMode="translate" onModeChange={mockOnModeChange} onSettingsClick={mockOnSettingsClick} />);
      const settingsButton = screen.getByLabelText(/settings/i);
      fireEvent.click(settingsButton);
      expect(mockOnSettingsClick).toHaveBeenCalled();
    });
  });
});