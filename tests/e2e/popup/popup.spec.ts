import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1').filter({ hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('submits text and displays result', async ({ page }) => {
    // Write text to the textarea
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('Hello world');

    // Click submit button
    const submitBtn = page.locator('button', { hasText: '翻译' }).first();

    // Wait for mock result
    await page.waitForTimeout(2000);
  });
});
