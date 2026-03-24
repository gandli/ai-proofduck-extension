import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

import {
  EXTENSION_ID,
  cleanupExtensionContext,
  launchExtensionContext,
  openExtensionSidepanel,
} from './browser-session.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const rootDir = process.cwd();
  const extensionPath = path.join(rootDir, 'dist', 'chrome-mv3');
  const outputDir = path.join(rootDir, 'output', 'playwright');
  const sampleText = 'Hello from ProofDuck GPU test.';
  let launched = null;

  await fs.mkdir(outputDir, { recursive: true });

  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`
      <!doctype html>
      <html>
        <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:40px;line-height:1.8;font-size:20px;">
          <p id="sample">${sampleText}</p>
          <p>第二段只是为了保证页面有一些额外内容。</p>
        </body>
      </html>
    `);
  });

  try {
    await new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve(undefined)));
    });

    const address = server.address();
    assert(address && typeof address !== 'string', '测试页面启动失败');

    launched = await launchExtensionContext({
      browser: 'chromium',
      extensionPath,
      headless: false,
      enableWebGpu: true,
      label: 'proofduck-real',
    });

    console.log('REAL 浏览器: chromium（单实例）');

    const sidepanel = await openExtensionSidepanel(launched.context, EXTENSION_ID);
    await sidepanel.getByRole('button', { name: '设置' }).click();
    await sidepanel.locator('select').nth(0).selectOption('English');
    await sidepanel.locator('select').nth(1).selectOption('local');

    const wasmFallbackCheckbox = sidepanel.locator('input[type="checkbox"]').nth(0);
    if (await wasmFallbackCheckbox.isChecked()) {
      await wasmFallbackCheckbox.uncheck();
    }

    await sidepanel.getByRole('button', { name: '关闭' }).click();
    await sidepanel.locator('textarea').fill(sampleText);
    await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
    await sidepanel.getByRole('button', { name: '执行翻译' }).click();

    await sidepanel.getByText('本地 AI（GPU）').waitFor({ timeout: 180000 });
    const sidepanelResult = sidepanel.locator('[data-proofduck-result-text="true"]');
    await sidepanelResult.waitFor({ timeout: 10000 });
    const sidepanelResultText = (await sidepanelResult.innerText()).trim();
    assert(sidepanelResultText && sidepanelResultText !== 'Result will appear here.', '侧边栏没有拿到真实翻译结果');

    const sidepanelShot = path.join(outputDir, 'real-browser-single-chromium-sidepanel.png');
    await sidepanel.screenshot({ path: sidepanelShot });

    const page = await launched.context.newPage();
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle' });
    await page.locator('#sample').selectText();

    const trigger = page.locator('[data-proofduck-trigger="true"]');
    await trigger.waitFor({ state: 'visible', timeout: 20000 });
    await trigger.hover();

    const inlineEngine = page.locator('[data-proofduck-inline-engine="true"]');
    const inlineResult = page.locator('[data-proofduck-inline-result="true"]');
    await inlineEngine.getByText('本地 AI（GPU）').waitFor({ timeout: 20000 });
    await inlineResult.waitFor({ timeout: 20000 });
    const inlineResultText = (await inlineResult.innerText()).trim();
    assert(inlineResultText === sidepanelResultText, '页内卡片结果和侧边栏结果没有保持一致');

    const inlineShot = path.join(outputDir, 'real-browser-single-chromium-inline.png');
    await page.screenshot({ path: inlineShot });

    console.log('REAL OK');
    console.log(`SIDEPANEL_RESULT=${sidepanelResultText}`);
    console.log(`INLINE_RESULT=${inlineResultText}`);
    console.log(`SIDEPANEL_SHOT=${sidepanelShot}`);
    console.log(`INLINE_SHOT=${inlineShot}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve(undefined))));
    await cleanupExtensionContext(launched?.context ?? null, launched?.userDataDir ?? '');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
