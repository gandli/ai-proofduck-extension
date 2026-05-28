import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock APIs before the extension code loads
    await page.addInitScript(() => {
      (window as any).chrome = {
        runtime: {
          id: 'test-id',
          getURL: (path: string) => path,
          onMessage: { addListener: () => {}, removeListener: () => {} },
          sendMessage: async () => ({})
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en-US'
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => {},
            onChanged: { addListener: () => {}, removeListener: () => {} }
          }
        }
      };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toContainText('ProofDuck');
  });

  test('settings button is clickable', async ({ page }) => {
    const button = page.locator('header button');
    await expect(button).toBeVisible();
    await button.click();

    // Check if settings panel is opened (dialog role)
    const settingsPanel = page.getByRole('dialog');
    await expect(settingsPanel).toBeVisible();
  });

  test('can switch tabs', async ({ page }) => {
    const translateTab = page.locator('button[role="tab"]').first();
    const proofreadTab = page.locator('button[role="tab"]').nth(1);

    await expect(translateTab).toBeVisible();
    await proofreadTab.click();

    // Check aria-selected state
    await expect(proofreadTab).toHaveAttribute('aria-selected', 'true');
  });
});
