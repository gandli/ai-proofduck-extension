import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockChrome = {
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
        },
        runtime: {
          id: 'mock-id',
          getURL: (path: string) => path,
          getManifest: () => ({ version: '1.0.0' })
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {},
          }
        }
      };
      (window as any).chrome = mockChrome;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('displays settings button', async ({ page }) => {
    const button = page.getByRole('button', { name: 'settings' });
    await expect(button).toBeVisible();
  });

  test('displays translation tab', async ({ page }) => {
    const tab = page.getByRole('tab', { name: 'tabTranslate' });
    await expect(tab).toBeVisible();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });
});
