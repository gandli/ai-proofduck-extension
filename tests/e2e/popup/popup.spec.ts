import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('button is clickable', async ({ page }) => {
    const button = page.locator('button');
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toContainText('1');
  });

  test('counter increments on multiple clicks', async ({ page }) => {
    const button = page.locator('button');
    await button.click();
    await button.click();
    await button.click();
    await expect(button).toContainText('3');
  });
});
