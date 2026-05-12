import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Mock Chrome extension APIs for Playwright tests
      (window as any).chrome = {
        i18n: {
          getMessage: (key: string) => key,
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
            onChanged: {
              addListener: () => {},
              removeListener: () => {},
            },
          },
          sync: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
            onChanged: {
              addListener: () => {},
              removeListener: () => {},
            },
          },
        },
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `http://localhost:3000${path}`,
          onMessage: {
            addListener: () => {},
            removeListener: () => {},
          },
          sendMessage: () => Promise.resolve(),
        },
      };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toContainText('ProofDuck');
  });

  test('renders tab navigation', async ({ page }) => {
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
