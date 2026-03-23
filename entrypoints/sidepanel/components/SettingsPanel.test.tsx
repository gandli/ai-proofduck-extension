import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Settings } from '../../shared/contracts';
import { SettingsPanel } from './SettingsPanel';

const baseSettings: Settings = {
  targetLanguage: '中文',
  enginePreference: 'auto',
  localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  localAllowWasmFallback: true,
  translationFallbackEnabled: true,
  onlineApiBase: '',
  onlineApiKey: '',
  onlineModel: '',
};

afterEach(() => {
  cleanup();
});

describe('SettingsPanel', () => {
  it('shows local model, online llm api and fallback sections under auto strategy', () => {
    render(
      <SettingsPanel
        open
        settings={baseSettings}
        onClose={vi.fn()}
        onChange={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByRole('heading', { name: '本地模型' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '在线 LLM API' })).toBeTruthy();
    expect(screen.getByText('启用翻译兜底')).toBeTruthy();
  });

  it('hides local model section when strategy switches to online', async () => {
    render(
      <SettingsPanel
        open
        settings={{ ...baseSettings, enginePreference: 'online' }}
        onClose={vi.fn()}
        onChange={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.queryByRole('heading', { name: '本地模型' })).toBeNull();
    expect(screen.getByRole('heading', { name: '在线 LLM API' })).toBeTruthy();
    expect(screen.getByText('启用翻译兜底')).toBeTruthy();
  });

  it('shows only local model and fallback for local strategy', () => {
    render(
      <SettingsPanel
        open
        settings={{ ...baseSettings, enginePreference: 'local' }}
        onClose={vi.fn()}
        onChange={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByRole('heading', { name: '本地模型' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '在线 LLM API' })).toBeNull();
    expect(screen.getByText('启用翻译兜底')).toBeTruthy();
  });

  it('shows only fallback for chrome built-in ai strategy', () => {
    render(
      <SettingsPanel
        open
        settings={{ ...baseSettings, enginePreference: 'chrome-ai' }}
        onClose={vi.fn()}
        onChange={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.queryByRole('heading', { name: '本地模型' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '在线 LLM API' })).toBeNull();
    expect(screen.getByText('启用翻译兜底')).toBeTruthy();
  });
});
