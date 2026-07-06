/**
 * 校对鸭 v0.3.0 完整功能 Demo：所有入口截图 + SelectionBubble 交互录屏
 *
 * 产物目录：/tmp/pd-demo/
 *   screenshots/
 *     - popup-default.png            默认状态
 *     - popup-open-sidepanel.png     hover 按钮态（可选）
 *     - sidepanel-idle.png           空态
 *     - sidepanel-source-lang.png    源语言下拉
 *     - sidepanel-target-lang.png    目标语言下拉
 *     - sidepanel-mode.png           模式下拉（翻译/摘要/润色/纠错/扩写）
 *     - sidepanel-translated.png     真翻译结果 + 引擎徽章
 *     - options-blank.png            设置页初态
 *     - options-deepseek-preset.png  点击 DeepSeek 预设后
 *     - options-free-translate-off.png 关闭免费翻译开关
 *   videos/
 *     - selection-bubble-flow.webm   划词浮标完整流程录屏
 */
import { test, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, mkdirSync, existsSync, readdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '..', '..', 'dist', 'chrome-mv3');
const OUT = '/tmp/pd-demo';
const SHOTS = path.join(OUT, 'screenshots');
const VIDS = path.join(OUT, 'videos');

// 清理旧产物
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });
mkdirSync(VIDS, { recursive: true });

test.setTimeout(180_000);

test('demo: 截取所有入口 + 录制划词浮标交互流程', async () => {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-demo-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
    viewport: { width: 1200, height: 800 },
    recordVideo: { dir: VIDS, size: { width: 1280, height: 720 } },
  });

  // 关键：Stub 掉 navigator.gpu，让 WebLLM.isAvailable() 返回 false
  // 从而 pickBest() 落到 free-translate（Google 端点，秒回），避免 950MB 模型下载
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      get() { return undefined; },
    });
  });

  // 起本地 HTTP server（file:// 不注入 CS）
  const server = http.createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html>
<html lang="en"><head><title>Proofduck Demo Page</title>
<style>
  body { font: 16px/1.7 -apple-system, sans-serif; max-width: 720px; margin: 60px auto; padding: 0 24px; color: #1a1a1a; }
  h1 { color: #0369a1; }
  p { margin: 1em 0; }
  mark { background: #fff3bf; padding: 0 4px; }
</style></head>
<body>
<h1>校对鸭 Selection Bubble Demo</h1>
<p>Try selecting text below — a 🦆 bubble should appear:</p>
<p id="target">Machine learning is a subfield of artificial intelligence
that gives computers the ability to learn without being explicitly programmed.</p>
<p>Another paragraph: <mark>The quick brown fox jumps over the lazy dog.</mark></p>
</body></html>`);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as { port: number }).port;
  const demoUrl = `http://127.0.0.1:${port}/`;

  try {
    // 等 SW 起来拿 extId
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extId = worker.url().split('/')[2];

    // ============ 1. Popup 截图 ============
    {
      const p = await context.newPage();
      await p.setViewportSize({ width: 380, height: 500 });
      await p.goto(`chrome-extension://${extId}/popup.html`);
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${SHOTS}/popup-default.png`, fullPage: true });
      await p.close();
    }

    // ============ 2. SidePanel 空态 ============
    {
      const p = await context.newPage();
      await p.setViewportSize({ width: 440, height: 800 });
      await p.goto(`chrome-extension://${extId}/sidepanel.html`);
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(1200);  // 等 engine detect
      await p.screenshot({ path: `${SHOTS}/sidepanel-idle.png`, fullPage: true });

      // 打开语言/模式下拉截图（存在则试）
      const sourceLang = p.locator('select').nth(0);
      if (await sourceLang.count() > 0) {
        await sourceLang.evaluate((el) => (el as HTMLSelectElement).focus());
        await p.screenshot({ path: `${SHOTS}/sidepanel-source-lang.png`, fullPage: true });
      }

      // 输入文本
      const textarea = p.locator('textarea').first();
      if (await textarea.count() > 0) {
        await textarea.fill('Machine learning is amazing.');
        await p.waitForTimeout(300);
        await p.screenshot({ path: `${SHOTS}/sidepanel-input.png`, fullPage: true });

        // 点翻译按钮
        const btn = p.getByRole('button', { name: /翻译|Translate/i }).first();
        if (await btn.count() > 0 && await btn.isEnabled()) {
          await btn.click();
          // 等到出现译文或超时 15s（Google 端点通常 <1s，给足网络时间）
          try {
            await p.waitForFunction(
              () => {
                // 输出区是 div 而非 textarea，全文档扫描中文字符
                // 排除输入 textarea（Machine learning...）本身
                const body = document.body.textContent ?? '';
                // 中文超过 3 个字符 → 判定翻译成功
                const chinese = body.match(/[\u4e00-\u9fa5]/g) ?? [];
                // 页面固定中文（"校对鸭 · 侧边栏"、"引擎"、"翻译" 等）大约 20 个
                // 出现译文后中文字符会明显增多
                return chinese.length > 30;
              },
              { timeout: 15000 },
            );
          } catch (e) {
            console.log('[warn] 等译文超时，仍截图看当前态');
          }
          await p.waitForTimeout(800);
          await p.screenshot({ path: `${SHOTS}/sidepanel-translated.png`, fullPage: true });
        }
      }
      await p.close();
    }

    // ============ 3. Options 截图 ============
    {
      const p = await context.newPage();
      await p.setViewportSize({ width: 900, height: 900 });
      await p.goto(`chrome-extension://${extId}/options.html`);
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${SHOTS}/options-blank.png`, fullPage: true });

      // 点 DeepSeek 预设
      const deepseek = p.getByRole('button', { name: /DeepSeek/i }).first();
      if (await deepseek.count() > 0) {
        await deepseek.click();
        await p.waitForTimeout(400);
        await p.screenshot({ path: `${SHOTS}/options-deepseek-preset.png`, fullPage: true });
      }

      // 切换免费翻译开关（找 role=switch）
      const toggle = p.getByRole('switch').first();
      if (await toggle.count() > 0) {
        await toggle.click();
        await p.waitForTimeout(400);
        await p.screenshot({ path: `${SHOTS}/options-free-translate-toggled.png`, fullPage: true });
      }

      await p.close();
    }

    // ============ 4. SelectionBubble 录屏（真网页流程） ============
    {
      const page = await context.newPage();
      await page.goto(demoUrl);
      await page.waitForSelector('#proofduck-selection-bubble-root', {
        state: 'attached',
        timeout: 10_000,
      });
      await page.waitForTimeout(600);

      // 选中一段文本
      await page.evaluate(() => {
        const target = document.getElementById('target')!;
        const range = document.createRange();
        range.setStart(target.firstChild!, 0);
        range.setEnd(target.firstChild!, 60); // "Machine learning is a subfield of artificial intelligence"
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        // 主动派 mouseup + selectionchange
        document.dispatchEvent(new Event('selectionchange'));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });

      // 等浮标出现（Shadow DOM 内的按钮）
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${SHOTS}/bubble-visible.png`, fullPage: false });

      // 点击浮标里的 🦆翻译 按钮（穿透 Shadow DOM）
      await page.evaluate(() => {
        const host = document.getElementById('proofduck-selection-bubble-root');
        const btn = host?.shadowRoot?.querySelector('button');
        (btn as HTMLElement | null)?.click();
      });

      // 等 loading 或 success
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOTS}/bubble-loading.png`, fullPage: false });

      // 等到浮标里出现真实译文（特定中文词，排除页面本身的中文）
      try {
        await page.waitForFunction(
          () => {
            const host = document.getElementById('proofduck-selection-bubble-root');
            const txt = host?.shadowRoot?.textContent ?? '';
            // 排除按钮上的"翻译"和 loading 的"翻译中"，等实际译文出现
            // 原文含 "Machine learning" → 译文含 "机器" 或 "学习"
            return /机器|学习|智能|人工/.test(txt);
          },
          { timeout: 15000 },
        );
      } catch {
        console.log('[warn] 浮标 15s 内未出译文，仍截图看当前态');
      }
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SHOTS}/bubble-result.png`, fullPage: false });

      // 换选区，验证浮标跟随
      await page.evaluate(() => {
        const mark = document.querySelector('mark')!;
        const range = document.createRange();
        range.selectNodeContents(mark);
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        mark.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SHOTS}/bubble-new-selection.png`, fullPage: false });

      // 点击页面其他地方 dismiss
      await page.mouse.click(50, 50);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SHOTS}/bubble-dismissed.png`, fullPage: false });

      await page.close();
    }

    console.log('\n✅ Demo 完成！');
    console.log(`   截图: ${SHOTS}`);
    console.log(`   录屏: ${VIDS}`);
  } finally {
    await context.close();
    server.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
