import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'test-id',
          getURL: (path: string) => path,
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
          },
        },
      };
      (window as any).chrome = mockChrome;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });
});
