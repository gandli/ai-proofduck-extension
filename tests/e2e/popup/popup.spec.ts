import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(`
      window.chrome = {
        runtime: {
          id: 'mock-extension-id',
          getURL: (path) => \`http://localhost:3000\${path}\`
        },
        tabs: {
          query: () => Promise.resolve([{ url: 'http://example.com' }]),
          sendMessage: () => Promise.resolve()
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
            onChanged: { addListener: () => {}, removeListener: () => {} }
          }
        },
        i18n: {
          getMessage: (key) => key,
          getUILanguage: () => 'en-US'
        }
      };
    `);
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('ProofDuck');
  });

  test('button is clickable', async ({ page }) => {
    // 假设 popup 中有设置按钮可点击
    const settingsBtn = page.locator('header button[title="settings"]');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // 点击后应该显示设置面板 (包含 dialog role)
    const settingsPanel = page.locator('div[role="dialog"]');
    await expect(settingsPanel).toBeVisible();
  });

  test('tabs are visible and switchable', async ({ page }) => {
    // 验证 Tabs 可见
    const tabList = page.locator('div[role="tablist"]');
    await expect(tabList).toBeVisible();

    const proofreadTab = page.locator('button[id="tab-proofread"]');
    await expect(proofreadTab).toBeVisible();
    await proofreadTab.click();

    // 验证 Tab 切换状态
    await expect(proofreadTab).toHaveAttribute('aria-selected', 'true');
  });
});
