import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
          sendMessage: () => Promise.resolve({}),
          onMessage: { addListener: () => {}, removeListener: () => {} },
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
        },
        storage: {
          local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
        },
      };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toHaveText('ProofDuck');
  });

  test('translation tab is default', async ({ page }) => {
    const tab = page.locator('[role="tab"][aria-selected="true"]');
    await expect(tab).toBeVisible();
  });
});
