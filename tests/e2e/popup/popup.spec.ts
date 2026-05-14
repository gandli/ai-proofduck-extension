import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      globalThis.chrome = {
        storage: { local: { get: () => Promise.resolve({}), set: () => Promise.resolve() } },
        i18n: { getMessage: (key: string) => key },
      } as any;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1', { hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('displays tab navigation', async ({ page }) => {
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();
  });
});
