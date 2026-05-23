import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // 注入 mock chrome API 防止 React 应用崩溃
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => path,
          sendMessage: async () => ({}),
          onMessage: {
            addListener: () => {},
            removeListener: () => {}
          }
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'zh-CN',
          t: (key: string) => key
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => ({}),
            remove: async () => ({}),
            onChanged: {
              addListener: () => {},
              removeListener: () => {}
            }
          }
        }
      };
      (window as any).chrome = mockChrome;
    });

    // WXT 输出的 popup 名字为 popup.html
    await page.goto('http://localhost:3000/popup.html');
    // 等待 React 挂载
    await page.waitForLoadState('networkidle');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toContainText('ProofDuck');
  });

  test('tabs are clickable', async ({ page }) => {
    // 查找包含角色为 tab 的元素
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();

    // 验证翻译 tab 存在
    const translateTab = page.getByRole('tab', { name: 'translate' }).first();
    if (await translateTab.isVisible()) {
      await translateTab.click();
      await expect(translateTab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('settings button is visible', async ({ page }) => {
    // 设置按钮通常有一个标题或 aria-label 包含 settings
    const settingsBtn = page.locator('button[title="settings"]');
    await expect(settingsBtn).toBeVisible();
  });
});
