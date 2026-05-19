import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // 模拟 Chrome 扩展 API
      window.chrome = window.chrome || {} as any;

      // 模拟 chrome.i18n
      window.chrome.i18n = window.chrome.i18n || {
        getMessage: (key: string) => key,
        getUILanguage: () => 'zh-CN',
      } as any;

      // 模拟 chrome.runtime
      window.chrome.runtime = window.chrome.runtime || {
        getURL: (path: string) => path,
        id: 'test-extension-id',
      } as any;

      // 模拟 chrome.storage
      window.chrome.storage = window.chrome.storage || {
        local: {
          get: async () => ({}),
          set: async () => {},
          onChanged: {
            addListener: () => {},
            removeListener: () => {},
          },
        },
      } as any;
    });

    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('ProofDuck');
  });

  test('navigation tabs exist', async ({ page }) => {
    // 这个项目没有单纯的 "button" 计数器了，而是有多个 tab buttons 和一个设置按钮
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    // 应该至少有翻译/校对等选项卡
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(4); // 翻译, 校对, 润色, 扩写
  });

  test('can switch tabs', async ({ page }) => {
    const proofreadTab = page.locator('#tab-proofread');
    await proofreadTab.click();

    await expect(proofreadTab).toHaveAttribute('aria-selected', 'true');

    const panel = page.locator('#panel-proofread');
    await expect(panel).toBeVisible();
  });
});
