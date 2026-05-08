# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: popup/popup.spec.ts >> Popup UI >> submits text and displays result
- Location: tests/e2e/popup/popup.spec.ts:13:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('textarea')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('textarea')

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Popup UI', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('http://localhost:3000/popup.html');
  6  |   });
  7  |
  8  |   test('displays popup title', async ({ page }) => {
  9  |     const title = page.locator('h1').filter({ hasText: 'ProofDuck' });
  10 |     await expect(title).toBeVisible();
  11 |   });
  12 |
  13 |   test('submits text and displays result', async ({ page }) => {
  14 |     // Write text to the textarea
  15 |     const textarea = page.locator('textarea');
> 16 |     await expect(textarea).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
  17 |     await textarea.fill('Hello world');
  18 |
  19 |     // Click submit button
  20 |     const submitBtn = page.locator('button', { hasText: '翻译' }).first();
  21 |
  22 |     // Wait for mock result
  23 |     await page.waitForTimeout(2000);
  24 |   });
  25 | });
  26 |
```