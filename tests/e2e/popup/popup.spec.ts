import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockChrome = {
        runtime: {
          id: 'test-id',
          getURL: (path: string) => path,
        },
        i18n: {
          getMessage: (key: string) => key,
          getUILanguage: () => 'en',
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve(),
          },
        },
      };
      (window as any).chrome = mockChrome;
    });
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toHaveText('ProofDuck');
  });

  test('translation flow works', async ({ page }) => {
    // Write text in the textarea
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('Hello world');

    // Click submit button (wait for it to become enabled)
    const button = page.getByRole('button', { name: /tabStartTranslate/i });
    await expect(button).not.toBeDisabled();

    // We cannot reliably assert loading state during the await, so we just trigger it
    // and wait for the mock API response directly
    await button.click();

    // Wait for the mock result
    const resultBox = page.locator('div.whitespace-pre-wrap');
    await expect(resultBox).toContainText('[翻译结果] Hello world', { timeout: 3000 });
  });

  test('tab switching works', async ({ page }) => {
    // Switch to proofread tab
    const proofreadTab = page.getByRole('tab', { name: /tabProofread/i });
    await proofreadTab.click();

    // Verify tab changed and submit button updated
    await expect(proofreadTab).toHaveAttribute('aria-selected', 'true');
    const button = page.getByRole('button', { name: /tabStartProofread/i });
    await expect(button).toBeVisible();
  });
});
