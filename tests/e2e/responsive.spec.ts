import { test, expect } from '@playwright/test';

const BASE_URL = `file://${process.cwd()}/index.html`;

test.describe('Responsive Design', () => {
  test('Mobile viewport hides desktop nav links', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    // Desktop nav links should be hidden on mobile
    const navLinks = page.locator('.nav-links a.hm');
    const count = await navLinks.count();
    for (let i = 0; i < count; i++) {
      await expect(navLinks.nth(i)).toBeHidden();
    }
  });

  test('Hero text is readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.hero .tagline')).toBeVisible();
  });

  test('Desktop viewport shows nav links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL);
    const navLinks = page.locator('.nav-links a.hm');
    const count = await navLinks.count();
    for (let i = 0; i < count; i++) {
      await expect(navLinks.nth(i)).toBeVisible();
    }
  });
});
