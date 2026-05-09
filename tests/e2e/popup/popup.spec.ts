import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('ProofDuck');
  });

  test('displays tab list', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
