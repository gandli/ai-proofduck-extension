## 2024-05-24 - Add focus visible styles for keyboard navigation
**Learning:** Playwright E2E tests for the popup UI need explicit mocks for `chrome` extension APIs (like `runtime`, `i18n`, `storage`) to prevent silent rendering failures when the popup is tested in isolation via HTTP instead of as an actual extension context.
**Action:** When writing Playwright tests that hit extension HTML files directly (e.g. `popup.html`), always use `await page.addInitScript()` in `test.beforeEach` to inject a `mockChrome` object into the global `window` scope before the React app mounts.
