import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'mock-id',
          getURL: (path: string) => path,
          onMessage: { addListener: () => {} }
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en'
        },
        storage: {
          local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
          sync: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
          onChanged: { addListener: () => {} }
        }
      };
      (window as any).chrome = mockChrome;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('ProofDuck');
  });

  test('has tab navigation', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    // Default tab should be translate
    const translateTab = page.locator('#tab-translate');
    await expect(translateTab).toBeVisible();
    await expect(translateTab).toHaveAttribute('aria-selected', 'true');
  });
});
