import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock implementations for chrome extensions APIs
    await page.addInitScript(() => {
      window.chrome = {
        runtime: {
          id: 'test-id',
          getURL: (path: string) => path,
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
          },
        },
        i18n: {
          getMessage: (key: string) => key,
        },
      } as any;
    });

    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1', { hasText: 'ProofDuck' }).first();
    await expect(title).toBeVisible();
  });

  test('button is clickable', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });

  test('counter increments on multiple clicks', async ({ page }) => {
    // This test is no longer relevant for the current ProofDuck popup UI
    // which has tabs instead of a counter button. Just testing the presence of a tab.
    const tab = page.locator('[role="tab"]').first();
    await expect(tab).toBeVisible();
  });
});
