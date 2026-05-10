import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toContainText('ProofDuck');
  });

  test('tab navigation is present', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });

  test('can click tabs', async ({ page }) => {
    const proofreadTab = page.locator('button[role="tab"]', { hasText: '✏️' });
    await proofreadTab.click();
    await expect(proofreadTab).toHaveAttribute('aria-selected', 'true');
  });
});
