import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock extensions APIs since they aren't available in local HTTP server testing
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => path,
        },
        i18n: {
          getMessage: (key: string) => key,
          t: (key: string) => key,
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
    const title = page.locator('h1').filter({ hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('settings button is visible', async ({ page }) => {
    // Note: The previous test was assuming a generic counter button which no longer exists.
    // We update it to check for the settings button by title attribute.
    const settingsButton = page.locator('button[title="settings"]');
    await expect(settingsButton).toBeVisible();
  });
});
