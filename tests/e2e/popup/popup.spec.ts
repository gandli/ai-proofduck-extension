import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock implementations for required extension APIs
    await page.addInitScript(() => {
      window.chrome = {
        runtime: {
          getURL: (path) => path,
          id: 'test-extension-id',
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {},
            onChanged: {
              addListener: () => {},
              removeListener: () => {}
            }
          }
        },
        i18n: {
          getMessage: (key) => key
        }
      };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup header', async ({ page }) => {
    // The proofduck app header actually contains an h1 with the title
    const header = page.locator('h1');
    await expect(header).toContainText('ProofDuck');
  });

  test('displays tab navigation', async ({ page }) => {
    // Verify the tablist is visible
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();
  });
});
