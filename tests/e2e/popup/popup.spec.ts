import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).chrome = {
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
            onChanged: { addListener: () => {}, removeListener: () => {} }
          }
        },
        i18n: { getMessage: (k: string) => k, getUILanguage: () => 'en' },
        runtime: { getURL: (p: string) => p, id: 'test-id' }
      };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('navigation is present', async ({ page }) => {
    const nav = page.locator('[role="tablist"]');
    await expect(nav).toBeVisible();
  });

  test('settings button is clickable', async ({ page }) => {
    const settingsBtn = page.getByRole('button', { name: /设置|settings/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    const settingsTitle = page.locator('h2[id="settings-title"]');
    await expect(settingsTitle).toBeVisible();
  });
});
