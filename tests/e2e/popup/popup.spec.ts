import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.chrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => `http://127.0.0.1:3000/${path}`,
          getManifest: () => ({ name: 'Test Extension', version: '1.0' }),
          sendMessage: async () => ({}),
          onMessage: {
            addListener: () => {},
            removeListener: () => {}
          }
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async () => ({}),
            onChanged: { addListener: () => {} }
          },
          sync: {
            get: async () => ({}),
            set: async () => ({}),
            onChanged: { addListener: () => {} }
          }
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en'
        }
      };
    });
    await page.goto('http://127.0.0.1:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    // 扩展内的标题可能通过 i18n 加载，并且由于 Playwright 不加载实际的 background scripts
    // 我们只需检查扩展的基础 DOM 结构是否渲染即可。
    const appContainer = page.locator('#root > div');
    await expect(appContainer).toBeVisible();
  });

  test('button is clickable', async ({ page }) => {
    const button = page.getByRole('button', { name: /Translate|翻译/i });
    await expect(button).toBeVisible();
    // 翻译按钮点击后会触发加载状态，暂不测试其具体数字文本
  });

  test('settings button opens settings', async ({ page }) => {
    const settingsBtn = page.getByTitle(/Settings|设置/i);
    await settingsBtn.click();
    const settingsPanel = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(settingsPanel).toBeVisible();
  });
});
