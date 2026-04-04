import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // 注入 mock 扩展环境
    await page.addInitScript(() => {
      (window as any).chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
          sendMessage: async () => ({}),
          onMessage: { addListener: () => {}, removeListener: () => {} },
        },
        tabs: {
          query: async () => [{ id: 1, url: 'http://example.com' }],
          sendMessage: async () => ({}),
        },
        storage: {
          local: {
            get: async () => ({
              'proofduck-settings': { language: 'en' }
            }),
            set: async () => {},
            onChanged: { addListener: () => {}, removeListener: () => {} },
          }
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en-US',
        }
      };
    });

    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('settings button is clickable', async ({ page }) => {
    const button = page.getByRole('button', { name: 'settings' });
    await expect(button).toBeVisible();
    await button.click();

    // Check if settings panel appears
    const settingsTitle = page.locator('h2', { hasText: 'Settings' }).or(page.locator('h2', { hasText: '设置' }));
    await expect(settingsTitle).toBeVisible();
  });
});
