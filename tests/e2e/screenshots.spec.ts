/**
 * 截图 SidePanel + Popup，人眼看看真实长啥样
 */
import { test, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '..', '..', 'dist', 'chrome-mv3');
const OUT = '/tmp/pd-screenshots';

test('capture sidepanel + popup + options screenshots', async () => {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-shot-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox'],
    viewport: { width: 420, height: 800 },
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extId = worker.url().split('/')[2];

    const p1 = await context.newPage();
    await p1.goto(`chrome-extension://${extId}/sidepanel.html`);
    await p1.waitForTimeout(1000);
    await p1.screenshot({ path: `${OUT}/sidepanel.png`, fullPage: true });

    const p2 = await context.newPage();
    await p2.setViewportSize({ width: 380, height: 500 });
    await p2.goto(`chrome-extension://${extId}/popup.html`);
    await p2.waitForTimeout(1000);
    await p2.screenshot({ path: `${OUT}/popup.png`, fullPage: true });

    const p3 = await context.newPage();
    await p3.setViewportSize({ width: 720, height: 900 });
    await p3.goto(`chrome-extension://${extId}/options.html`);
    await p3.waitForTimeout(1000);
    await p3.screenshot({ path: `${OUT}/options.png`, fullPage: true });

    console.log('Screenshots at:', OUT);
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
