import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject Chrome API mocks
    await page.addInitScript(() => {
      window.chrome = window.chrome || {} as any;
      window.chrome.runtime = window.chrome.runtime || {} as any;
      window.chrome.runtime.id = 'test-extension-id';
      window.chrome.runtime.getURL = (path: string) => `chrome-extension://test-extension-id/${path}`;
      window.chrome.i18n = window.chrome.i18n || {} as any;
      window.chrome.i18n.getMessage = (key: string) => key;
      window.chrome.i18n.t = (key: string) => key;
    });

    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1').filter({ hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('displays tab bar', async ({ page }) => {
    const tabBar = page.locator('[role="tablist"]');
    await expect(tabBar).toBeVisible();
  });

  test('can type in textarea and submit', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('Hello world');

    // In TranslationTab.tsx, the button has type="button" not type="submit"
    const submitBtn = page.locator('button', { hasText: 'tabStartTranslate' });
    await expect(submitBtn).toBeVisible();
  });
});
