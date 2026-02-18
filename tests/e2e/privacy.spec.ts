import { test, expect } from '@playwright/test';

const BASE_URL = `file://${process.cwd()}/index.html`;

test.describe('Privacy Policy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Seven privacy policy cards are displayed', async ({ page }) => {
    const cards = page.locator('#privacy .p-card');
    await expect(cards).toHaveCount(7);
  });

  test('Each privacy card has a title', async ({ page }) => {
    const cards = page.locator('#privacy .p-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).locator('h3')).toBeVisible();
    }
  });

  test('Last updated date is displayed', async ({ page }) => {
    const dateEl = page.locator('[data-i18n="priv_date"]');
    await expect(dateEl).toBeVisible();
    const text = await dateEl.textContent();
    expect(text).toMatch(/2026/);
  });
});
