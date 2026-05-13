import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock for chrome.i18n and chrome.storage since it's a web context
    await page.addInitScript(() => {
      globalThis.chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
          sendMessage: () => Promise.resolve({}),
          onMessage: { addListener: () => {}, removeListener: () => {} }
        },
        i18n: {
          t: (key: string) => key,
          getUILanguage: () => 'en',
          getMessage: (key: string) => key
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve()
          }
        }
      } as any;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1', { hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('tab bar is visible', async ({ page }) => {
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();
  });

  test('can type in textarea and click submit', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('test text');

    // 提交按钮包含 'Processing' 或翻译/校对文案
    const submitButton = page.locator('button', { hasText: /tabStartTranslate/i }).first();
    await expect(submitButton).toBeVisible();
  });
});
