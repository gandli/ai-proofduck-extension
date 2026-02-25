// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { fakeBrowser } from 'wxt/testing';

describe('Performance Check', () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    // Set initial settings storage
    await fakeBrowser.storage.local.set({
        settings: {
            extensionLanguage: 'English',
            engine: 'chrome-ai', // default to avoid network calls
        }
    });
    // Mock tabs query if possible
    if (fakeBrowser.tabs.query.mockResolvedValue) {
        fakeBrowser.tabs.query.mockResolvedValue([]);
    }
  });

  it('renders app and simulates typing', async () => {
    render(<App />);

    // Wait for initial render (it has async loadPersistedSettings)
    const textarea = await screen.findByPlaceholderText('Select text on web...');

    // Type 10 characters
    for (let i = 0; i < 10; i++) {
        await act(async () => {
             fireEvent.change(textarea, { target: { value: 'a'.repeat(i + 1) } });
        });
    }

    expect(textarea.value).toBe('aaaaaaaaaa');
  });
});
