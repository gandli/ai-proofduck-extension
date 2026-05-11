import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).chrome = {
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
            remove: () => Promise.resolve(),
          },
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
        },
        runtime: {
          id: 'test-id',
        },
      };
      (window as any).browser = (window as any).chrome;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    // Wait for the React app to render inside #root
    await page.waitForSelector('.proofduck-popup');
    const title = page.locator('h1', { hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('displays tab navigation', async ({ page }) => {
    await page.waitForSelector('.proofduck-popup');
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
