import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';

import { chromium } from 'playwright';

async function main() {
  const rootDir = process.cwd();
  const extensionPath = path.join(rootDir, 'dist', 'chrome-mv3');
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proofduck-smoke-'));
  const extensionId = 'lpfkhijjjhbcbbllnmdnahiooodajcim';
  let onlineRequestCount = 0;
  let fallbackRequestCount = 0;

  async function clearSelection(page) {
    await page.evaluate(() => {
      window.getSelection()?.removeAllRanges();
      document.dispatchEvent(new Event('selectionchange'));
    });
  }

  async function gotoWithRetry(page, url, attempts = 4) {
    let lastError = null;

    for (let index = 0; index < attempts; index += 1) {
      try {
        await page.goto(url);
        return;
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(400);
      }
    }

    throw lastError;
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');

    if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
      onlineRequestCount += 1;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [{ message: { content: 'Remote translation result' } }],
        }),
      );
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`
      <html>
        <body style="font-family:sans-serif;padding:32px">
          <article>
            <h1>校对鸭 Smoke</h1>
            <p id="sample">
              校对鸭是一个面向网页阅读与写作场景的助手，它帮助用户在浏览流程里完成翻译、摘要、校对、润色和扩写。
            </p>
          </article>
        </body>
      </html>
    `);
  });

  try {
    await new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve(undefined)));
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to start local smoke server');
    }
    const sampleUrl = `http://127.0.0.1:${address.port}/`;

    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        '--disable-webgpu',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      const sidepanelUrl = `chrome-extension://${extensionId}/sidepanel.html`;
      console.log('STEP 1: start route stubs');

      await context.route('https://translate.googleapis.com/**', async (route) => {
        fallbackRequestCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[['推理']]]),
        });
      });

      console.log('STEP 2: open sidepanel and configure online API');
      const sidepanel = await context.newPage();
      await gotoWithRetry(sidepanel, sidepanelUrl);
      await sidepanel.waitForLoadState('networkidle');
      await sidepanel.getByRole('button', { name: '设置' }).click();
      await sidepanel.getByPlaceholder('https://example.com/v1').fill(`http://127.0.0.1:${address.port}/v1`);
      await sidepanel.getByPlaceholder('sk-...').fill('test-key');
      await sidepanel.getByPlaceholder('gpt-like-model').fill('demo-model');
      await sidepanel.locator('select').nth(1).selectOption('online');
      await sidepanel.getByRole('button', { name: '关闭' }).click();

      console.log('STEP 3: open sample page');
      const page = await context.newPage();
      await page.goto(sampleUrl);
      await page.waitForLoadState('networkidle');

      console.log('STEP 4: hover chick and verify inline + sidepanel use same online result');
      await page.waitForTimeout(1000);
      await page.locator('#sample').selectText();
      const trigger = page.locator('[data-proofduck-trigger="true"]');
      await trigger.waitFor({ state: 'visible', timeout: 15000 });
      await trigger.hover();
      await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
      await sidepanel.locator('textarea').waitFor({ timeout: 10000 });
      await sidepanel.getByRole('heading', { name: 'TRANSLATION' }).waitFor({ timeout: 10000 });
      await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
      if (onlineRequestCount !== 1) {
        throw new Error(`Expected exactly one online translation request after hover, got ${onlineRequestCount}`);
      }
      if (fallbackRequestCount !== 0) {
        throw new Error(`Expected no fallback translation request during hover, got ${fallbackRequestCount}`);
      }
      await page.getByRole('button', { name: '关闭翻译弹窗' }).click();
      await page.getByText('Remote translation result').waitFor({ state: 'hidden', timeout: 10000 });

      console.log('STEP 5: popup should disappear after copy');
      await page.mouse.move(20, 20);
      await clearSelection(page);
      await page.locator('#sample').selectText();
      await trigger.waitFor({ state: 'visible', timeout: 15000 });
      await trigger.hover();
      await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: 'Copy' }).click();
      await page.getByText('Remote translation result').waitFor({ state: 'hidden', timeout: 10000 });

      console.log('STEP 6: popup should disappear when clicking outside');
      await page.mouse.move(20, 20);
      await clearSelection(page);
      await page.locator('#sample').selectText();
      await trigger.waitFor({ state: 'visible', timeout: 15000 });
      await trigger.hover();
      await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
      await page.mouse.click(20, 20);
      await page.getByText('Remote translation result').waitFor({ state: 'hidden', timeout: 10000 });

      console.log('STEP 7: click chick and verify no duplicate translation request');
      await page.mouse.move(20, 20);
      await page.locator('#sample').selectText();
      await trigger.waitFor({ state: 'visible', timeout: 15000 });
      await trigger.click();
      const importedText = await sidepanel.locator('textarea').inputValue();
      if (!importedText.includes('校对鸭是一个面向网页阅读与写作场景的助手')) {
        throw new Error('Imported draft was not loaded into sidepanel');
      }
      await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
      await page.waitForTimeout(600);
      if (onlineRequestCount !== 1) {
        throw new Error(`Expected click to reuse hover translation result, got ${onlineRequestCount} online requests`);
      }
      if (fallbackRequestCount !== 0) {
        throw new Error(`Expected click flow to avoid fallback translation requests, got ${fallbackRequestCount}`);
      }

      console.log('SMOKE OK');
    } finally {
      await context.close();
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve(undefined))));
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
