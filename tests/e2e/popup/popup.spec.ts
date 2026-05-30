import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
        },
        i18n: {
          getMessage: (key: string) => key,
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
          },
        },
      };
      (window as any).chrome = mockChrome;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('ProofDuck');
  });

  test('tab bar is visible and interactive', async ({ page }) => {
    const tabs = page.locator('button[role="tab"]');
    await expect(tabs.first()).toBeVisible();

    // Default tab should be selected
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');

    // Click second tab
    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('translation functionality works', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    const submitBtn = page.locator('button:has-text("tabStartTranslate")');
    await expect(submitBtn).toBeDisabled();

    await textarea.fill('Hello world');
    await expect(submitBtn).toBeEnabled();
  });
});
