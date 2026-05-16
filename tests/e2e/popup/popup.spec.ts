import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.chrome = {
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
          detectLanguage: (text: string, callback: any) => callback({ isReliable: true, languages: [{ language: 'en', percentage: 100 }] })
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
            onChanged: { addListener: () => {} }
          }
        },
        runtime: {
          getURL: (path: string) => path,
          id: 'mock-id'
        }
      } as any;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('settings button is clickable', async ({ page }) => {
    // Both t() and fallback to 'settings' / '设置' might be evaluated in the UI based on mock behavior
    const settingsButton = page.locator('button[title="settings"], button[aria-label="settings"], button[title="设置"], button[aria-label="设置"]').first();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    // 验证设置面板是否显示
    const settingsPanel = page.locator('.fixed.inset-0.bg-black\\/50').first();
    await expect(settingsPanel).toBeVisible();
  });
});
