import { test, expect } from '@playwright/test';

const BASE_URL = `file://${process.cwd()}/index.html`;

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Nav bar is visible with logo and links', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('.nav-logo')).toBeVisible();
    const navLinks = page.locator('.nav-links a.hm');
    await expect(navLinks).toHaveCount(4);
  });

  test('Anchor links scroll to correct sections', async ({ page }) => {
    // Click "功能特性" link
    await page.locator('a[href="#features"]').first().click();
    await page.waitForTimeout(500);
    const featuresVisible = await page.locator('#features').isVisible();
    expect(featuresVisible).toBe(true);

    // Click "推理引擎"
    await page.locator('a[href="#engines"]').first().click();
    await page.waitForTimeout(500);
    const enginesVisible = await page.locator('#engines').isVisible();
    expect(enginesVisible).toBe(true);

    // Click "隐私政策"
    await page.locator('a[href="#privacy"]').first().click();
    await page.waitForTimeout(500);
    const privacyVisible = await page.locator('#privacy').isVisible();
    expect(privacyVisible).toBe(true);
  });

  test('Chrome Web Store CTA link is correct', async ({ page }) => {
    const cta = page.locator('.cta-primary');
    await expect(cta).toHaveAttribute('href', /chromewebstore\.google\.com/);
  });
});
