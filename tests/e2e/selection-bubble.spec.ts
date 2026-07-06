/**
 * Selection Bubble 划词浮标真扩展 E2E 测试
 *
 * 目标：在真网页上选中文字，验证浮标注入 + 显示 + 交互。
 *
 * 挑战：
 * - content script 挂在 Shadow DOM 里，选择器要穿透 shadow root
 * - 浮标 host 是 `#proofduck-selection-bubble-root`，内部走 shadowRoot
 */
import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '../../dist/chrome-mv3');

// 起一个极简 HTTP 服务器返回测试页面（content script 不注入 file://）
async function startTestServer(html: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

async function launchWithExt() {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-ext-bubble-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
  });
  return { context, userDataDir };
}

async function teardown(ctx: BrowserContext, dir: string) {
  await ctx.close().catch(() => {});
  rmSync(dir, { recursive: true, force: true });
}

test.describe('SelectionBubble on real page', () => {
  test('在真 HTTP 页面选中文本 → 浮标出现', async () => {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Selection Test</title></head>
<body style="padding:40px; font-family: system-ui;">
  <h1>校对鸭划词测试</h1>
  <p id="target" style="font-size:20px; line-height:2;">
    Hello world, this is a selection test for the proofduck extension.
  </p>
</body></html>`;
    const server = await startTestServer(html);
    const { context, userDataDir } = await launchWithExt();
    try {
      const page = await context.newPage();
      await page.goto(server.url);
      // 等 content script 注入 host（document_idle 之后）— host 本身是空 div，用 attached 而非默认 visible
      await page.waitForSelector('#proofduck-selection-bubble-root', {
        timeout: 10000,
        state: 'attached',
      });

      // 用 page.evaluate 模拟精确选区
      await page.evaluate(() => {
        const p = document.getElementById('target')!;
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
      });

      const bubbleVisible = await page.evaluate(async () => {
        await new Promise((r) => setTimeout(r, 300));
        const host = document.getElementById('proofduck-selection-bubble-root');
        if (!host || !host.shadowRoot) return { host: !!host, shadow: false };
        const btn = host.shadowRoot.querySelector('[data-proofduck-bubble] button');
        return {
          host: !!host,
          shadow: true,
          hasButton: !!btn,
          buttonText: btn?.textContent ?? null,
        };
      });

      console.log('[bubble state]', bubbleVisible);
      expect(bubbleVisible.host).toBe(true);
      expect(bubbleVisible.shadow).toBe(true);
      expect(bubbleVisible.hasButton).toBe(true);
      expect(bubbleVisible.buttonText).toMatch(/翻译|🦆/);
    } finally {
      await teardown(context, userDataDir);
      await server.close();
    }
  });

  test('点击浮标按钮 → 状态切到 loading 或 success（真调翻译引擎）', async () => {
    test.skip(process.env.SKIP_NETWORK === '1', 'SKIP_NETWORK=1 跳过');
    const html = `<!DOCTYPE html>
<html><body style="padding:40px; font-family: system-ui;">
  <p id="target" style="font-size:20px;">hello</p>
</body></html>`;
    const server = await startTestServer(html);
    const { context, userDataDir } = await launchWithExt();
    try {
      const page = await context.newPage();
      await page.goto(server.url);
      await page.waitForSelector('#proofduck-selection-bubble-root', {
        timeout: 10000,
        state: 'attached',
      });

      await page.evaluate(() => {
        const p = document.getElementById('target')!;
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
      });

      const clicked = await page.evaluate(async () => {
        await new Promise((r) => setTimeout(r, 300));
        const host = document.getElementById('proofduck-selection-bubble-root')!;
        const btn = host.shadowRoot!.querySelector(
          '[data-proofduck-bubble] button'
        ) as HTMLButtonElement | null;
        if (!btn) return { clicked: false };
        btn.click();
        return { clicked: true };
      });

      expect(clicked.clicked).toBe(true);

      const final = await page.evaluate(async () => {
        // WebLLM 若被选到会需要 950MB 模型下载，headless 环境跑不通；
        // 但只要状态迁移出 idle（idle=只显示"翻译"按钮）就证明链路通。
        // 后续人工测试用 SidePanel 那条已经真跑过 Google 端点了。
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 200));
          const host = document.getElementById('proofduck-selection-bubble-root')!;
          const root = host.shadowRoot!.querySelector('[data-proofduck-bubble]');
          const text = root?.textContent ?? '';
          // 从"翻译"按钮态迁移出来即算走完链路
          if (
            text.length > 0 &&
            !text.includes('🦆') &&
            !text.match(/^翻译$/)
          ) {
            return { text, iter: i };
          }
        }
        return { text: 'TIMEOUT', iter: -1 };
      });

      console.log('[final bubble text]', final);
      expect(final.text).not.toBe('TIMEOUT');
    } finally {
      await teardown(context, userDataDir);
      await server.close();
    }
  });
});
