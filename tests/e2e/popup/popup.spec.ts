import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Mock chrome extension APIs required by the popup
    await page.addInitScript(() => {
      globalThis.chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => path,
          onMessage: { addListener: () => {} },
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {},
          },
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
        },
      } as any;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toContainText('ProofDuck');
  });
});
