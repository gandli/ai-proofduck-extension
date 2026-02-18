import { test, expect } from '@playwright/test';

const BASE_URL = `file://${process.cwd()}/index.html`;

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Hero section renders correctly', async ({ page }) => {
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.hero .tagline')).toBeVisible();
    await expect(page.locator('.hero-badge')).toBeVisible();
    await expect(page.locator('.cta-primary')).toBeVisible();
  });

  test('Five feature cards are displayed', async ({ page }) => {
    const cards = page.locator('#features .feature-card');
    await expect(cards).toHaveCount(5);
    // Verify each has an icon, title, and description
    for (let i = 0; i < 5; i++) {
      await expect(cards.nth(i).locator('.feature-icon')).toBeVisible();
      await expect(cards.nth(i).locator('h3')).toBeVisible();
      await expect(cards.nth(i).locator('p')).toBeVisible();
    }
  });

  test('Three engine cards are displayed', async ({ page }) => {
    const engines = page.locator('#engines .engine-card');
    await expect(engines).toHaveCount(3);
    const names = ['WebGPU', 'WASM', 'Online API'];
    for (let i = 0; i < 3; i++) {
      await expect(engines.nth(i).locator('h3')).toHaveText(names[i]);
    }
  });

  test('Three workflow steps are displayed', async ({ page }) => {
    const steps = page.locator('.step-card');
    await expect(steps).toHaveCount(3);
    // Step numbers 1, 2, 3
    for (let i = 0; i < 3; i++) {
      await expect(steps.nth(i).locator('.step-num')).toHaveText(String(i + 1));
    }
  });

  test('Slideshow section exists with slides', async ({ page }) => {
    const slides = page.locator('.slide');
    const count = await slides.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Footer is visible with links', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('.footer-links a')).toHaveCount(2);
  });
});
