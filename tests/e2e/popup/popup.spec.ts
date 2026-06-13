import { test, expect } from '@playwright/test';

test.describe('Popup UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/popup.html');
  });

  test('displays popup title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toContainText('ProofDuck');
  });

  test('clear button functionality', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // Clear button shouldn't be visible when input is empty
    const clearBtn = page.getByRole('button', { name: '清空文本' });
    await expect(clearBtn).not.toBeVisible();

    // Type text
    await textarea.fill('Hello world');
    await expect(textarea).toHaveValue('Hello world');

    // Clear button should now be visible
    await expect(clearBtn).toBeVisible();

    // Click clear button
    await clearBtn.click();

    // Textarea should be empty and clear button hidden
    await expect(textarea).toHaveValue('');
    await expect(clearBtn).not.toBeVisible();
  });
});
