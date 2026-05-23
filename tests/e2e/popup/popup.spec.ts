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
          t: (key: string) => key,
        },
      };
      (window as any).chrome = mockChrome;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1').filter({ hasText: 'ProofDuck' }).first();
    await expect(title).toBeVisible();
  });

  test('navigation tabs exist', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
