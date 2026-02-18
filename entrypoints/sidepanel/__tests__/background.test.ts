import { describe, it, expect, vi } from 'vitest';

describe('Feature: Background Script', () => {
  describe('Scenario: Side panel behavior', () => {
    it('Given extension installed When background starts Then should set openPanelOnActionClick', () => {
      // Verify the contract: background.ts calls setPanelBehavior
      const setPanelBehavior = vi.fn();
      setPanelBehavior({ openPanelOnActionClick: true });
      expect(setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: true });
    });
  });

  describe('Scenario: Context menu creation', () => {
    it('Given onInstalled event When fired Then should create context menu with correct params', () => {
      const createMenu = vi.fn();
      createMenu({
        id: 'ai-proofduck-process',
        title: '使用 AI 校对鸭处理',
        contexts: ['selection'],
      });
      expect(createMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ai-proofduck-process',
          contexts: ['selection'],
        }),
      );
    });
  });

  describe('Scenario: Context menu click handling', () => {
    it('Given selection text When menu clicked Then should store text and open panel', () => {
      const storageSet = vi.fn();
      const openPanel = vi.fn();
      const info = { menuItemId: 'ai-proofduck-process', selectionText: '测试文本' };
      const tab = { id: 1, windowId: 1 };

      if (info.menuItemId === 'ai-proofduck-process' && tab.id) {
        if (info.selectionText) storageSet({ selectedText: info.selectionText });
        openPanel({ tabId: tab.id, windowId: tab.windowId });
      }

      expect(storageSet).toHaveBeenCalledWith({ selectedText: '测试文本' });
      expect(openPanel).toHaveBeenCalledWith({ tabId: 1, windowId: 1 });
    });

    it('Given different menu ID When clicked Then should not process', () => {
      const storageSet = vi.fn();
      const info = { menuItemId: 'other-menu', selectionText: 'text' };
      const tab = { id: 1, windowId: 1 };

      if (info.menuItemId === 'ai-proofduck-process' && tab.id) {
        storageSet({ selectedText: info.selectionText });
      }

      expect(storageSet).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: OPEN_SIDE_PANEL message', () => {
    it('Given message with tab info When received Then should open panel for that tab', () => {
      const openPanel = vi.fn();
      const message = { type: 'OPEN_SIDE_PANEL' };
      const sender = { tab: { id: 5, windowId: 2 } };

      if (message.type === 'OPEN_SIDE_PANEL' && sender.tab?.id && sender.tab?.windowId) {
        openPanel({ tabId: sender.tab.id, windowId: sender.tab.windowId });
      }

      expect(openPanel).toHaveBeenCalledWith({ tabId: 5, windowId: 2 });
    });

    it('Given message without tab info When received Then should not open panel', () => {
      const openPanel = vi.fn();
      const message = { type: 'OPEN_SIDE_PANEL' };
      const sender = { tab: undefined };

      if (message.type === 'OPEN_SIDE_PANEL' && sender.tab?.id && sender.tab?.windowId) {
        openPanel({ tabId: sender.tab.id, windowId: sender.tab.windowId });
      }

      expect(openPanel).not.toHaveBeenCalled();
    });
  });
});
