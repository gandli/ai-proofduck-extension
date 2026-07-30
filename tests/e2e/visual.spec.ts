/** Screenshot E2E: verify UI after SRP split + frontend prompt alignment */
import { test, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXT_PATH = path.resolve(__dirname, '..', '..', 'dist', 'chrome-mv3');

test('options page — OpenAiCompatSection renders', async () => {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-vis-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
  });
  try {
    const sw = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 10_000 });
    const extId = new URL(sw.url()).host;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/options.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    // 即使 chrome.* mock 不完整，截图不应空白
    await page.screenshot({ path: 'screenshots/options.png', fullPage: true });
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});

test('sidepanel page — renders', async () => {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-vis-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
  });
  try {
    const sw = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 10_000 });
    const extId = new URL(sw.url()).host;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/sidepanel.png', fullPage: true });
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});

test('popup page — renders', async () => {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-vis-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
  });
  try {
    const sw = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 10_000 });
    const extId = new URL(sw.url()).host;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/popup.png', fullPage: true });
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
