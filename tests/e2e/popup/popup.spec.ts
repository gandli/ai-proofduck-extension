import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Mock chrome extension APIs before navigation
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'test-extension-id',
          getURL: (path: string) => path,
        },
        i18n: {
          getMessage: (key: string) => key,
          t: (key: string) => key,
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
          }
        }
      };
      (window as any).chrome = mockChrome;
    });

    await page.goto('file://' + path.resolve(__dirname, '../../../.output/chrome-mv3/popup.html'));
  });

  test('popup mounts properly', async ({ page }) => {
    // Check main container
    const container = page.locator('#root');
    await expect(container).toBeAttached();
  });
});
