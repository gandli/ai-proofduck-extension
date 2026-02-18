import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature: Background Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.chrome = {
      sidePanel: {
        setOptions: vi.fn()
      },
      contextMenus: {
        create: vi.fn(),
        onClicked: {
          addListener: vi.fn()
        }
      },
      runtime: {
        onMessage: {
          addListener: vi.fn()
        }
      }
    } as any;
  });

  describe('Scenario: SidePanel Behavior Setting', () => {
    it('Given sidePanel When setting options Then should configure correctly', () => {
      global.chrome.sidePanel.setOptions({ path: 'sidepanel.html' });
      expect(global.chrome.sidePanel.setOptions).toHaveBeenCalledWith({ path: 'sidepanel.html' });
    });
  });

  describe('Scenario: Context Menu Creation', () => {
    it('Given context menu When creating Then should have correct properties', () => {
      global.chrome.contextMenus.create({
        id: 'translate-selection',
        title: 'Translate selected text',
        contexts: ['selection']
      });
      expect(global.chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'translate-selection',
        title: 'Translate selected text',
        contexts: ['selection']
      });
    });
  });

  describe('Scenario: Context Menu Click Handling', () => {
    it('Given menu click When detected Then should handle correctly', () => {
      const mockListener = vi.fn();
      (global.chrome.contextMenus.onClicked.addListener as any).mockImplementation(callback => {
        mockListener.mockImplementation(callback);
      });
      global.chrome.contextMenus.onClicked.addListener(mockListener);
      mockListener({ menuItemId: 'translate-selection', selectionText: 'test' });
      expect(mockListener).toHaveBeenCalledWith({ menuItemId: 'translate-selection', selectionText: 'test' });
    });
  });

  describe('Scenario: OPEN_SIDE_PANEL Message Handling', () => {
    it('Given OPEN_SIDE_PANEL message When received Then should open side panel', () => {
      const mockListener = vi.fn();
      (global.chrome.runtime.onMessage.addListener as any).mockImplementation(callback => {
        mockListener.mockImplementation(callback);
      });
      global.chrome.runtime.onMessage.addListener(mockListener);
      mockListener({ type: 'OPEN_SIDE_PANEL' });
      expect(mockListener).toHaveBeenCalledWith({ type: 'OPEN_SIDE_PANEL' });
    });
  });
});