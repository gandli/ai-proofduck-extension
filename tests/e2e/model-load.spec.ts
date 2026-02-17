import { test as base, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ }, use) => {
    const pathToExtension = path.join(process.cwd(), 'dist/chrome-mv3-dev');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background)
      background = await context.waitForEvent('serviceworker');

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

test.describe('Model Loading BDD Tests', () => {
  test('should successfully load DeepSeek R1 Distill Qwen 1.5B', async ({ page, extensionId }) => {
    // 1. Open Sidepanel
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    
    // 2. Open Settings
    await page.click('button:has-text("设置")');
    
    // 3. Select Model Dropdown
    await page.click('button:has-text("Qwen2.5-0.5B-Instruct-q4f16_1-MLC")'); // Default model
    
    // 4. Select DeepSeek Category and Model
    await page.click('button:has-text("DeepSeek")');
    await page.click('button:has-text("DeepSeek R1 Distill Qwen 1.5B (~953.5 MB)")');
    
    // 5. Close settings and check status
    await page.click('button:has-text("完成")');
    
    // 6. Verify loading progress exists (it might be fast if cached, but we check for general 404 failure absence)
    const statusButton = page.locator('footer button');
    await expect(statusButton).not.toContainText('错误');
    
    // 7. Wait for Ready (up to 2 minutes for download)
    await expect(statusButton).toContainText('就绪', { timeout: 120000 });
  });

  test('should gracefully handle network failure during model load', async ({ page, extensionId, context }) => {
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.click('button:has-text("设置")');
    
    // Select a model we haven't downloaded
    await page.click('button:has-text("Qwen")');
    await page.click('button:has-text("Qwen2 0.5B")');
    
    // Simulate offline
    await context.setOffline(true);
    
    await page.click('button:has-text("完成")');
    
    // Verify error message (should contain our custom "Load Error" friendly message)
    const statusButton = page.locator('footer button');
    await expect(statusButton).toContainText('错误', { timeout: 30000 });
    
    await context.setOffline(false);
  });
});
