import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
  },
  webServer: {
    command: 'cd dist/chrome-mv3 && python3 -m http.server 8877',
    port: 8877,
    reuseExistingServer: true,
  },
});
