import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPanel from '../components/SettingsPanel';

describe('Feature: Settings Panel', () => {
  const mockOnSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scenario: Engine Selection', () => {
    it('Given 4 engine options When rendering Then should show all options', () => {
      render(<SettingsPanel settings={{ engine: 'online' }} onSettingsChange={mockOnSettingsChange} />);
      const engineOptions = screen.getAllByRole('option');
      expect(engineOptions.length).toBeGreaterThanOrEqual(4);
    });

    it('Given engine change When selected Then should trigger callback', () => {
      render(<SettingsPanel settings={{ engine: 'online' }} onSettingsChange={mockOnSettingsChange} />);
      const select = screen.getByLabelText(/engine/i);
      fireEvent.change(select, { target: { value: 'chrome-ai' } });
      expect(mockOnSettingsChange).toHaveBeenCalledWith({ engine: 'chrome-ai' });
    });
  });

  describe('Scenario: Language Selection', () => {
    it('Given 7 languages When rendering Then should show all options', () => {
      render(<SettingsPanel settings={{ language: 'en' }} onSettingsChange={mockOnSettingsChange} />);
      const languageOptions = screen.getAllByRole('option');
      expect(languageOptions.length).toBeGreaterThanOrEqual(7);
    });

    it('Given language change When selected Then should trigger callback', () => {
      render(<SettingsPanel settings={{ language: 'en' }} onSettingsChange={mockOnSettingsChange} />);
      const select = screen.getByLabelText(/language/i);
      fireEvent.change(select, { target: { value: 'zh-CN' } });
      expect(mockOnSettingsChange).toHaveBeenCalledWith({ language: 'zh-CN' });
    });
  });

  describe('Scenario: Local Model Selection', () => {
    it('Given local-gpu engine When selected Then should show model selection', () => {
      render(<SettingsPanel settings={{ engine: 'local-gpu' }} onSettingsChange={mockOnSettingsChange} />);
      expect(screen.getByLabelText(/local model/i)).toBeInTheDocument();
    });

    it('Given local-wasm engine When selected Then should show model selection', () => {
      render(<SettingsPanel settings={{ engine: 'local-wasm' }} onSettingsChange={mockOnSettingsChange} />);
      expect(screen.getByLabelText(/local model/i)).toBeInTheDocument();
    });

    it('Given online engine When selected Then should not show model selection', () => {
      render(<SettingsPanel settings={{ engine: 'online' }} onSettingsChange={mockOnSettingsChange} />);
      expect(screen.queryByLabelText(/local model/i)).not.toBeInTheDocument();
    });
  });

  describe('Scenario: API Configuration', () => {
    it('Given online engine When selected Then should show API key input', () => {
      render(<SettingsPanel settings={{ engine: 'online' }} onSettingsChange={mockOnSettingsChange} />);
      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    });

    it('Given non-online engine When selected Then should not show API key input', () => {
      render(<SettingsPanel settings={{ engine: 'chrome-ai' }} onSettingsChange={mockOnSettingsChange} />);
      expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();
    });

    it('Given API key input When changed Then should trigger callback', () => {
      render(<SettingsPanel settings={{ engine: 'online' }} onSettingsChange={mockOnSettingsChange} />);
      const input = screen.getByLabelText(/api key/i);
      fireEvent.change(input, { target: { value: 'test-key' } });
      expect(mockOnSettingsChange).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });
  });

  describe('Scenario: Tone and Detail Preferences', () => {
    it('Given tone selection When changed Then should trigger callback', () => {
      render(<SettingsPanel settings={{ tone: 'neutral' }} onSettingsChange={mockOnSettingsChange} />);
      const select = screen.getByLabelText(/tone/i);
      fireEvent.change(select, { target: { value: 'formal' } });
      expect(mockOnSettingsChange).toHaveBeenCalledWith({ tone: 'formal' });
    });

    it('Given detail selection When changed Then should trigger callback', () => {
      render(<SettingsPanel settings={{ detail: 'medium' }} onSettingsChange={mockOnSettingsChange} />);
      const select = screen.getByLabelText(/detail/i);
      fireEvent.change(select, { target: { value: 'detailed' } });
      expect(mockOnSettingsChange).toHaveBeenCalledWith({ detail: 'detailed' });
    });
  });

  describe('Scenario: autoSpeak Switch', () => {
    it('Given autoSpeak toggle When clicked Then should trigger callback', () => {
      render(<SettingsPanel settings={{ autoSpeak: false }} onSettingsChange={mockOnSettingsChange} />);
      const checkbox = screen.getByLabelText(/auto speak/i);
      fireEvent.click(checkbox);
      expect(mockOnSettingsChange).toHaveBeenCalledWith({ autoSpeak: true });
    });
  });
});