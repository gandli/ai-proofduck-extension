import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { DEFAULT_SETTINGS } from '../types';
import type { Settings } from '../types';

describe('Feature: useSettings Logic', () => {
  beforeEach(() => {
    fakeBrowser.reset();
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
      const settings = { ...DEFAULT_SETTINGS, engine: 'online', apiModel: 'gpt-4' };
      const { apiKey, ...rest } = settings;
      await browser.storage.local.set({ settings: { ...rest, apiKey: '' } });

      const result = await browser.storage.local.get('settings');
      expect(result.settings.engine).toBe('online');
      expect(result.settings.apiModel).toBe('gpt-4');
      expect(result.settings.apiKey).toBe('');
    });

    it('Given apiKey When saved to session storage Then should be separate from local', async () => {
      await browser.storage.session.set({ apiKey: 'secret-123' });
      await browser.storage.local.set({ settings: { engine: 'online' } });

      const session = await browser.storage.session.get('apiKey');
      const local = await browser.storage.local.get('settings');

      expect(session.apiKey).toBe('secret-123');
      expect(local.settings.apiKey).toBeUndefined();
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
      const result = await browser.storage.local.get('selectedText');
      expect(result.selectedText).toBe('从右键菜单获取的文本');
    });

    it('Given activeTab=settings in storage When loading Then should open settings', async () => {
      await browser.storage.local.set({ activeTab: 'settings' });
      const result = await browser.storage.local.get('activeTab');
      expect(result.activeTab).toBe('settings');
    });
  });

  describe('Scenario: Engine status persistence', () => {
    it('Given engine status When changed Then should persist to storage', async () => {
      await browser.storage.local.set({ engineStatus: 'loading' });
      let result = await browser.storage.local.get('engineStatus');
      expect(result.engineStatus).toBe('loading');

      await browser.storage.local.set({ engineStatus: 'ready' });
      result = await browser.storage.local.get('engineStatus');
      expect(result.engineStatus).toBe('ready');
    });
  });
});
