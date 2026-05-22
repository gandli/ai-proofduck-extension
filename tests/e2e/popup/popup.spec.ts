import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock chrome APIs for local testing
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => path,
          onMessage: {
            addListener: () => {},
            removeListener: () => {}
          }
        },
        i18n: {
          getMessage: (key: string) => key,
          t: (key: string) => key
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {}
          }
        }
      };
      (window as any).chrome = mockChrome;
    });

    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1', { hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('displays tab navigation', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
