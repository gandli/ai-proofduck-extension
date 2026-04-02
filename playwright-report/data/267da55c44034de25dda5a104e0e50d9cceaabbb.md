# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: popup/popup.spec.ts >> Popup UI >> displays popup title
- Location: tests/e2e/popup/popup.spec.ts:8:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1')

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
  9  |     const title = page.locator('h1');
> 10 |     await expect(title).toBeVisible();
     |                         ^ Error: expect(locator).toBeVisible() failed
  11 |   });
  12 | 
  13 |   test('button is clickable', async ({ page }) => {
  14 |     const button = page.locator('button');
  15 |     await expect(button).toBeVisible();
  16 |     await button.click();
  17 |     await expect(button).toContainText('1');
  18 |   });
  19 | 
  20 |   test('counter increments on multiple clicks', async ({ page }) => {
  21 |     const button = page.locator('button');
  22 |     await button.click();
  23 |     await button.click();
  24 |     await button.click();
  25 |     await expect(button).toContainText('3');
  26 |   });
  27 | });
  28 | 
```