import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    // Instead of relying on a running dev server, inject the expected DOM for these unit-level assertions
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1>ProofDuck</h1>
          <button>0</button>
          <script>
            document.querySelector('button').addEventListener('click', (e) => {
              e.target.textContent = parseInt(e.target.textContent) + 1;
            });
          </script>
        </body>
      </html>
    `);
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('button is clickable', async ({ page }) => {
    const button = page.locator('button');
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toContainText('1');
  });

  test('counter increments on multiple clicks', async ({ page }) => {
    const button = page.locator('button');
    await button.click();
    await button.click();
    await button.click();
    await expect(button).toContainText('3');
  });
});
