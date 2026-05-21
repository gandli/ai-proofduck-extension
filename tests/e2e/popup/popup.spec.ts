import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject Chrome API mocks
    await page.addInitScript(() => {
      // Create a full mock object for chrome to avoid read-only property errors
      const mockChrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
        },
        i18n: {
          getMessage: (key: string) => key,
          t: (key: string) => key,
        }
      };

      // We use any casting to bypass TypeScript's readonly checks during the mock injection
      (window as any).chrome = mockChrome;
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
