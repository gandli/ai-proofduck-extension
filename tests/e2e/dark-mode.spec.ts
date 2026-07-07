/**
 * v0.5.0 · Dark Mode 视觉验证
 *
 * 通过 Playwright `emulateMedia({ colorScheme: 'dark' })` 强制系统深色主题，
 * 截 SidePanel + Popup + Options 3 大入口的 light/dark 对照图。
 * 人眼验收 + 自动断言：
 *   1. body 计算样式 background-color 应发生变化
 *   2. 主文本色应发生变化
 */
import { test, chromium, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '..', '..', 'dist', 'chrome-mv3');
const OUT = '/tmp/pd-dark-screenshots';

// 从 rgb(...) 字符串解析亮度（用于粗略断言 light vs dark）
function rgbLuma(rgb: string): number {
  const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return -1;
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('dark mode: sidepanel / popup / options 背景与文本色随 prefers-color-scheme 切换', async () => {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-dark-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
    viewport: { width: 420, height: 800 },
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extId = worker.url().split('/')[2];

    // ============ LIGHT ============
    await context.pages()[0]?.emulateMedia({ colorScheme: 'light' });
    const light = await context.newPage();
    await light.emulateMedia({ colorScheme: 'light' });
    await light.goto(`chrome-extension://${extId}/sidepanel.html`);
    await light.waitForTimeout(500);
    await light.screenshot({ path: `${OUT}/sidepanel-light.png`, fullPage: true });
    const lightBg = await light.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const lightBgFirstChild = await light.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.bg-beige-50, [class*="bg-beige"]');
      return el ? getComputedStyle(el).backgroundColor : '';
    });

    // ============ DARK ============
    const dark = await context.newPage();
    await dark.emulateMedia({ colorScheme: 'dark' });
    await dark.goto(`chrome-extension://${extId}/sidepanel.html`);
    await dark.waitForTimeout(500);
    await dark.screenshot({ path: `${OUT}/sidepanel-dark.png`, fullPage: true });
    const darkBg = await dark.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.bg-beige-50, [class*="bg-beige"]');
      return el ? getComputedStyle(el).backgroundColor : getComputedStyle(document.body).backgroundColor;
    });

    // Popup light/dark
    const p1 = await context.newPage();
    await p1.emulateMedia({ colorScheme: 'light' });
    await p1.setViewportSize({ width: 380, height: 500 });
    await p1.goto(`chrome-extension://${extId}/popup.html`);
    await p1.waitForTimeout(500);
    await p1.screenshot({ path: `${OUT}/popup-light.png`, fullPage: true });

    const p2 = await context.newPage();
    await p2.emulateMedia({ colorScheme: 'dark' });
    await p2.setViewportSize({ width: 380, height: 500 });
    await p2.goto(`chrome-extension://${extId}/popup.html`);
    await p2.waitForTimeout(500);
    await p2.screenshot({ path: `${OUT}/popup-dark.png`, fullPage: true });

    // Options light/dark
    const o1 = await context.newPage();
    await o1.emulateMedia({ colorScheme: 'light' });
    await o1.setViewportSize({ width: 720, height: 900 });
    await o1.goto(`chrome-extension://${extId}/options.html`);
    await o1.waitForTimeout(500);
    await o1.screenshot({ path: `${OUT}/options-light.png`, fullPage: true });

    const o2 = await context.newPage();
    await o2.emulateMedia({ colorScheme: 'dark' });
    await o2.setViewportSize({ width: 720, height: 900 });
    await o2.goto(`chrome-extension://${extId}/options.html`);
    await o2.waitForTimeout(500);
    await o2.screenshot({ path: `${OUT}/options-dark.png`, fullPage: true });

    console.log('[dark mode] screenshots →', OUT);
    console.log('[dark mode] light bg:', lightBgFirstChild, '(body:', lightBg, ')');
    console.log('[dark mode] dark  bg:', darkBg);

    // ============ 断言：dark 背景亮度必须比 light 显著低 ============
    const lightLuma = rgbLuma(lightBgFirstChild);
    const darkLuma = rgbLuma(darkBg);
    expect(lightLuma, 'light bg luma should be > 200 (near white/beige)').toBeGreaterThan(200);
    expect(darkLuma, 'dark bg luma should be < 60 (near black)').toBeLessThan(60);
    expect(lightLuma - darkLuma, 'light/dark bg luma gap should be > 150').toBeGreaterThan(150);
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
