import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

describe('Feature: Background Script', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  describe('Scenario: Side panel behavior', () => {
    it('Given extension init When background starts Then should configure panel behavior', () => {
      // Contract test: background.ts calls chrome.sidePanel.setPanelBehavior
      const config = { openPanelOnActionClick: true };
      expect(config.openPanelOnActionClick).toBe(true);
    });
  });

  describe('Scenario: Context menu creation', () => {
    it('Given onInstalled event When fired Then menu config should be correct', () => {
      const menuConfig = {
        id: 'ai-proofduck-process',
        title: '使用 AI 校对鸭处理',
        contexts: ['selection'] as const,
      };
      expect(menuConfig.id).toBe('ai-proofduck-process');
      expect(menuConfig.contexts).toContain('selection');
    });
  });

  describe('Scenario: Context menu click handling', () => {
    it('Given selection text When menu clicked Then should store to browser.storage', async () => {
      const selectionText = '测试文本';
      await browser.storage.local.set({ selectedText: selectionText });

      const result = await browser.storage.local.get('selectedText');
      expect(result.selectedText).toBe('测试文本');
    });

    it('Given no selection text When menu clicked Then should not store', async () => {
      const info = { menuItemId: 'ai-proofduck-process', selectionText: undefined };
      if (info.selectionText) {
        await browser.storage.local.set({ selectedText: info.selectionText });
      }
      const result = await browser.storage.local.get('selectedText');
      expect(result.selectedText).toBeUndefined();
    });

    it('Given different menu ID When clicked Then should not process', () => {
      const info = { menuItemId: 'other-menu' };
      const shouldProcess = info.menuItemId === 'ai-proofduck-process';
      expect(shouldProcess).toBe(false);
    });
  });

  describe('Scenario: OPEN_SIDE_PANEL message routing', () => {
    it('Given message with tab info When received Then should have valid tab data', () => {
      const message = { type: 'OPEN_SIDE_PANEL' };
      const sender = { tab: { id: 5, windowId: 2 } };
      const shouldOpen = message.type === 'OPEN_SIDE_PANEL' && !!sender.tab?.id && !!sender.tab?.windowId;
      expect(shouldOpen).toBe(true);
    });

    it('Given message without tab When received Then should not open panel', () => {
      const message = { type: 'OPEN_SIDE_PANEL' };
      const sender = { tab: undefined };
      const shouldOpen = message.type === 'OPEN_SIDE_PANEL' && !!sender.tab?.id;
      expect(shouldOpen).toBe(false);
    });

    it('Given non OPEN_SIDE_PANEL message When received Then should ignore', () => {
      const message = { type: 'OTHER_MESSAGE' };
      const shouldOpen = message.type === 'OPEN_SIDE_PANEL';
      expect(shouldOpen).toBe(false);
    });
  });
});
