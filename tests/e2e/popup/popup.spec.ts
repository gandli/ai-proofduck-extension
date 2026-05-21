import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // 注入必要的 chrome 扩展 API mock
    await page.addInitScript(() => {
      // @ts-ignore
      window.chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `http://localhost:3000/${path}`,
        },
        i18n: {
          getMessage: (key: string) => key,
          t: (key: string) => key,
        },
      };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1', { hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('displays navigation tabs', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
