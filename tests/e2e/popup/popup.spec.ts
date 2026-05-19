import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject Chrome API mocks
    await page.addInitScript(() => {
      window.chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `http://localhost:3000${path.startsWith('/') ? '' : '/'}${path}`,
          onMessage: {
            addListener: () => {},
            removeListener: () => {},
          },
          sendMessage: async () => ({}),
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {},
            onChanged: {
              addListener: () => {},
              removeListener: () => {},
            },
          },
        },
        i18n: {
          getMessage: (key: string) => key,
        },
      } as any;
    });

    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toHaveText('ProofDuck');
  });

  test('settings button is visible', async ({ page }) => {
    const button = page.locator('button[title="settings"]');
    await expect(button).toBeVisible();
  });
});
