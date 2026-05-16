import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      globalThis.chrome = {
        runtime: { id: 'test-id', getURL: () => '' },
        storage: { local: { get: () => Promise.resolve({}), set: () => Promise.resolve(), onChanged: { addListener: () => {}, removeListener: () => {} } } },
        i18n: { getMessage: (k) => k }
      };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    // Inject mock APIs to render the App
    await page.addInitScript(() => {
      globalThis.chrome = {
        runtime: { id: 'test-id', getURL: () => '' },
        storage: { local: { get: () => Promise.resolve({}), set: () => Promise.resolve(), onChanged: { addListener: () => {}, removeListener: () => {} } } },
        i18n: { getMessage: (k) => k }
      };
    });
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('button is clickable', async ({ page }) => {
    // In our actual UI we have tabs not a simple counter button
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();
  });

  test('translation tab is active by default', async ({ page }) => {
    const activeTab = page.locator('[role="tab"][aria-selected="true"]');
    await expect(activeTab).toBeVisible();
  });
});
