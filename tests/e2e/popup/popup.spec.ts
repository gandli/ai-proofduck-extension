import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the extension environment API before navigating to the popup
    await page.addInitScript(() => {
        (window as any).chrome = {
            runtime: {
                id: 'mock-id',
                getManifest: () => ({ name: 'Mock' }),
                getURL: (path: string) => path,
                onMessage: { addListener: () => {} },
                sendMessage: async () => ({})
            },
            storage: {
                local: { get: async () => ({}), set: async () => {} },
                session: { get: async () => ({}), set: async () => {} }
            },
            tabs: { query: async () => ([]) },
            i18n: {
                getMessage: (key: string) => {
                    const messages: any = {
                        popupTitle: { message: "ProofDuck" },
                        settings: { message: "设置" },
                        tabProofread: { message: "校对" }
                    };
                    return messages[key]?.message || key;
                },
                getUILanguage: () => 'zh-CN'
            }
        };
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1', { hasText: 'ProofDuck' });
    await expect(title).toBeVisible();
  });

  test('can open settings panel', async ({ page }) => {
    const settingsButton = page.locator('button[aria-label="设置"]');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Check if the settings panel appears
    const settingsTitle = page.locator('h2#settings-title');
    await expect(settingsTitle).toBeVisible();
  });

  test('can switch tabs', async ({ page }) => {
    const proofreadTab = page.locator('button[role="tab"]', { hasText: '校对' });
    await expect(proofreadTab).toBeVisible();
    await proofreadTab.click();

    // Check if the proofread panel is visible
    const panel = page.locator('#panel-proofread');
    await expect(panel).toBeVisible();
  });
});
