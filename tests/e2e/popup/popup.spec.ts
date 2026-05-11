import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      globalThis.chrome = {
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {},
            onChanged: { addListener: () => {}, removeListener: () => {} },
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
    const title = page.locator('h1');
    await expect(title).toContainText('ProofDuck');
  });

  test('displays tab navigation', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
