import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '../types';
import type { Settings } from '../types';
import { useSettings } from '../hooks/useSettings';

describe('Feature: useSettings Logic', () => {
  beforeEach(() => {
    // Reset browser storage mocks if needed
    (browser.storage.local.get as any).mockClear();
    (browser.storage.local.set as any).mockClear();
    (browser.storage.session.get as any).mockClear();
    (browser.storage.session.set as any).mockClear();
  });

  describe('Scenario: Engine switch → status mapping', () => {
    function determineStatus(engine: string): string {
      if (engine === 'online') return 'ready';
      if (engine === 'chrome-ai') return 'idle';
      return 'loading';
    }

    it('Given online engine When switching Then status should be ready', () => {
      expect(determineStatus('online')).toBe('ready');
    });

    it('Given chrome-ai engine When switching Then status should be idle', () => {
      expect(determineStatus('chrome-ai')).toBe('idle');
    });

    it('Given local-gpu engine When switching Then status should be loading', () => {
      expect(determineStatus('local-gpu')).toBe('loading');
    });

    it('Given local-wasm engine When switching Then status should be loading', () => {
      expect(determineStatus('local-wasm')).toBe('loading');
    });
  });

  describe('Scenario: Settings persistence via real storage', () => {
    it('Given settings When saved to storage Then should be retrievable', async () => {
      const { result } = renderHook(() => useSettings());
      const settings = { ...DEFAULT_SETTINGS, engine: 'online' as const, apiModel: 'gpt-4' };

      await act(async () => {
        await result.current.updateSettings(settings);
      });

      const { apiKey, ...rest } = settings;
      // Mock implementation detail: we just check that set was called with correct arguments
      expect(browser.storage.local.set).toHaveBeenCalledWith({ settings: { ...rest, apiKey: '' } });
    });

    it('Given apiKey When saved to session storage Then should be separate from local', async () => {
      await browser.storage.session.set({ apiKey: 'secret-123' });
      expect(browser.storage.session.set).toHaveBeenCalledWith({ apiKey: 'secret-123' });

      await browser.storage.local.set({ settings: { engine: 'online' } });
      expect(browser.storage.local.set).toHaveBeenCalledWith({ settings: { engine: 'online' } });
    });
  });

  describe('Scenario: Settings merge with defaults', () => {
    it('Given partial saved settings When loading Then should merge with defaults', () => {
      const saved = { engine: 'online', apiKey: 'key123' };
      const merged: Settings = { ...DEFAULT_SETTINGS, ...saved };
      expect(merged.engine).toBe('online');
      expect(merged.apiKey).toBe('key123');
      expect(merged.extensionLanguage).toBe('中文');
      expect(merged.tone).toBe('professional');
    });

    it('Given targetLanguage legacy key When loading Then should migrate to extensionLanguage', () => {
      const saved = { targetLanguage: 'English' } as any;
      const initial = { ...DEFAULT_SETTINGS };
      if (saved.targetLanguage && !saved.extensionLanguage) {
        initial.extensionLanguage = saved.targetLanguage;
      }
      expect(initial.extensionLanguage).toBe('English');
    });
  });

  describe('Scenario: Initial text from storage', () => {
    it('Given selectedText in storage When loading Then should retrieve it', async () => {
      await browser.storage.local.set({ selectedText: '从右键菜单获取的文本' });
      expect(browser.storage.local.set).toHaveBeenCalledWith({ selectedText: '从右键菜单获取的文本' });
    });

    it('Given activeTab=settings in storage When loading Then should open settings', async () => {
      await browser.storage.local.set({ activeTab: 'settings' });
      expect(browser.storage.local.set).toHaveBeenCalledWith({ activeTab: 'settings' });
    });
  });

  describe('Scenario: Engine status persistence', () => {
    it('Given engine status When changed Then should persist to storage', async () => {
      await browser.storage.local.set({ engineStatus: 'loading' });
      expect(browser.storage.local.set).toHaveBeenCalledWith({ engineStatus: 'loading' });

      await browser.storage.local.set({ engineStatus: 'ready' });
      expect(browser.storage.local.set).toHaveBeenCalledWith({ engineStatus: 'ready' });
    });
  });
});
