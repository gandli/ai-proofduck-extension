import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {},
          },
        }
      };
      (window as any).chrome = mockChrome;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toContainText('ProofDuck');
  });

  test('has tab navigation', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
