import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock APIs before navigation
    await page.addInitScript(() => {
      window.chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: path => `chrome-extension://test-extension-id/${path}`,
          sendMessage: () => Promise.resolve({}),
          onMessage: { addListener: () => {}, removeListener: () => {} },
        },
        i18n: {
          t: key => key,
          getMessage: key => key,
          getUILanguage: () => 'en',
        },
        storage: {
          local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
        }
      };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1').filter({ hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('settings button is visible', async ({ page }) => {
    const button = page.locator('button[title="settings"]');
    await expect(button).toBeVisible();
  });

  test('tab bar renders correctly', async ({ page }) => {
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(4);
  });
});
