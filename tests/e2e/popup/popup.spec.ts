import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/popup.html');
  });

  test('loads popup application', async ({ page }) => {
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });
});
