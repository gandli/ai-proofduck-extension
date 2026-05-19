import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error Mock extension APIs that WXT tries to access
      window.chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
          getManifest: () => ({ version: '1.0.0' }),
          sendMessage: () => Promise.resolve({}),
          onMessage: {
            addListener: () => {},
            removeListener: () => {},
          },
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
            onChanged: {
              addListener: () => {},
              removeListener: () => {},
            },
          },
          sync: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
          },
        },
      };
      // @ts-expect-error browser is often mapped to chrome
      window.browser = window.chrome;
    });

    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1', { hasText: 'ProofDuck' }).first();
    await expect(title).toBeVisible();
  });

  test('navigation tabs are visible', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
