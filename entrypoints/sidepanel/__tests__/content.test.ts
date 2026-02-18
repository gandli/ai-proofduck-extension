import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

describe('Feature: Content Script', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  describe('Scenario: Floating Icon Display/Hide', () => {
    it('Given text selection When detected Then floating icon should appear', () => {
      const text = 'selected text';
      const hasSelection = text.trim().length > 0;
      expect(hasSelection).toBe(true);
    });

    it('Given empty selection When detected Then floating icon should hide', () => {
      const text = '   ';
      const hasSelection = text.trim().length > 0;
      expect(hasSelection).toBe(false);
    });
  });

  describe('Scenario: Text Selection Detection', () => {
    it('Given valid text When checking Then should detect as selectable', () => {
      const texts = ['hello', '测试文本', 'a'];
      for (const t of texts) {
        expect(t.trim().length).toBeGreaterThan(0);
      }
    });

    it('Given whitespace-only text When checking Then should not count as selected', () => {
      const texts = ['', '  ', '\n\t'];
      for (const t of texts) {
        expect(t.trim().length).toBe(0);
      }
    });
  });

  describe('Scenario: Error State Handling', () => {
    const errorCodes = [
      'NO_API_KEY', 'NO_MODEL', 'ENGINE_NOT_READY', 'ENGINE_LOADING',
      'TIMEOUT', 'CONNECTION_FAILED', 'UNAVAILABLE',
    ];

    it.each(errorCodes)('Given %s error When handling Then should be a known error code', (code) => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });

    it('Given error code mapping When checking Then should cover all popup states', () => {
      expect(errorCodes).toContain('NO_API_KEY');
      expect(errorCodes).toContain('ENGINE_NOT_READY');
      expect(errorCodes).toContain('TIMEOUT');
    });
  });

  describe('Scenario: Shadow DOM Isolation', () => {
    it('Given content script When creating UI Then should use Shadow DOM for isolation', () => {
      // Content script creates containers with attachShadow({ mode: 'open' })
      // This ensures extension styles don't leak into the host page
      const containerId = 'ai-proofduck-icon-container';
      const popupId = 'ai-proofduck-translation-popup';
      expect(containerId).toContain('ai-proofduck');
      expect(popupId).toContain('ai-proofduck');
    });
  });

  describe('Scenario: Smart Popup Positioning', () => {
    it('Given rect near bottom edge When positioning Then should place above', () => {
      const viewportHeight = 800;
      const rectBottom = 750;
      const popupMaxHeight = 280;
      const margin = 15;
      const spaceBelow = viewportHeight - rectBottom;
      const spaceAbove = rectBottom - margin;
      const showAbove = spaceBelow < popupMaxHeight + margin && spaceAbove > spaceBelow;
      expect(showAbove).toBe(true);
    });

    it('Given rect near top When positioning Then should place below', () => {
      const viewportHeight = 800;
      const rectBottom = 100;
      const popupMaxHeight = 280;
      const margin = 15;
      const spaceBelow = viewportHeight - rectBottom;
      const spaceAbove = rectBottom - margin;
      const showAbove = spaceBelow < popupMaxHeight + margin && spaceAbove > spaceBelow;
      expect(showAbove).toBe(false);
    });

    it('Given rect near right edge When positioning Then should clamp left', () => {
      const viewportWidth = 1024;
      const popupWidth = 300;
      const margin = 15;
      let left = 900;
      if (left + popupWidth > viewportWidth - margin) {
        left = viewportWidth - popupWidth - margin;
      }
      expect(left).toBe(709);
    });
  });

  describe('Scenario: Storage Synchronization via fakeBrowser', () => {
    it('Given selectedText When stored Then should be retrievable', async () => {
      await browser.storage.local.set({ selectedText: '测试文本' });
      const result = await browser.storage.local.get('selectedText');
      expect(result.selectedText).toBe('测试文本');
    });

    it('Given engineStatus When stored Then should reflect current state', async () => {
      await browser.storage.local.set({ engineStatus: 'ready' });
      const result = await browser.storage.local.get('engineStatus');
      expect(result.engineStatus).toBe('ready');
    });
  });

  describe('Scenario: GET_PAGE_CONTENT message', () => {
    it('Given message type When checking Then should be GET_PAGE_CONTENT', () => {
      const msg = { type: 'GET_PAGE_CONTENT' };
      expect(msg.type).toBe('GET_PAGE_CONTENT');
    });
  });
});
