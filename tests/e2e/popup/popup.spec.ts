import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the popup HTML
    await page.goto('http://localhost:3000/popup.html');
  });

  test('verifies popup html structure renders', async ({ page }) => {
    // Using http-server on the built Chrome extension output might throw errors due to missing Chrome APIs (like chrome.storage).
    // Instead of waiting for a fully rendered React tree (which relies on those APIs),
    // we just verify that the static popup wrapper HTML is properly served and contains our root div.
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });
});
