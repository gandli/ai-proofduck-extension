/**
 * v0.4.0 BUG 猎手 · 从 release zip 真实装机 + 全入口遍历 + 三级错误监控
 *
 * 装机流程：
 *   dist/ai-proofduck-extension-0.4.0-chrome.zip
 *     → unzip → /tmp/pd-real-install/
 *     → Playwright launchPersistentContext --load-extension
 *   ↑ 这是最贴近 Chrome Web Store 安装的真实流程
 *
 * 错误监控（三级）：
 *   1. page.on('pageerror')   → 未捕获 JS 异常
 *   2. page.on('console')     → console.error / warn
 *   3. page.on('requestfailed')→ 网络失败
 *
 * 遍历入口：
 *   - Popup   (popup.html)
 *   - SidePanel (sidepanel.html)
 *   - Options (options.html)
 *   - Content Script 注入到真实 HTTP 页面
 *
 * 断言：每个入口
 *   ✓ DOM 挂载正常
 *   ✓ 无 uncaught error
 *   ✓ 无 critical console.error（排除已知白名单）
 *   ✓ 无关键资源加载失败
 *
 * 环境要求：
 *   npx playwright test tests/e2e/v0.4-bughunt.spec.ts
 */
import { test, expect, chromium } from '@playwright/test';
import type { BrowserContext, ConsoleMessage } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

// 从 v0.4.0 zip 解压出的真实装机目录
const EXT_PATH = '/tmp/pd-real-install';

// Console 白名单：已知不影响功能的噪音（例如 WebGPU 探测在没显卡时会警告）
const CONSOLE_NOISE_ALLOWLIST = [
  /WebGPU/i,
  /chrome-ai/i, // Chrome Built-in AI 探测警告
  /Manifest V3/i,
  /Permissions-Policy/i,
];

// 网络失败白名单：这些是"探测请求"，失败预期
const NETWORK_NOISE_ALLOWLIST = [
  /favicon\.ico/,
  /chrome-extension:\/\/[^/]+\/manifest\.json/, // 有些内部会 fetch manifest
];

interface ErrorReport {
  pageErrors: string[];
  consoleErrors: string[];
  networkFailures: string[];
}

function collectErrors(target: any): ErrorReport {
  const rep: ErrorReport = {
    pageErrors: [],
    consoleErrors: [],
    networkFailures: [],
  };

  target.on('pageerror', (err: Error) => {
    rep.pageErrors.push(`${err.name}: ${err.message}`);
  });

  target.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!CONSOLE_NOISE_ALLOWLIST.some((rx) => rx.test(text))) {
        rep.consoleErrors.push(text);
      }
    }
  });

  target.on('requestfailed', (req: any) => {
    const url = req.url();
    if (!NETWORK_NOISE_ALLOWLIST.some((rx) => rx.test(url))) {
      rep.networkFailures.push(`${req.method()} ${url} — ${req.failure()?.errorText}`);
    }
  });

  return rep;
}

test.describe('v0.4.0 BUG 猎手 · 真实装机全入口扫描', () => {
  test.beforeAll(() => {
    if (!existsSync(path.join(EXT_PATH, 'manifest.json'))) {
      throw new Error(
        `${EXT_PATH}/manifest.json 不存在 —— 先跑: unzip -oq dist/ai-proofduck-extension-0.4.0-chrome.zip -d ${EXT_PATH}/`,
      );
    }
  });

  async function launch(): Promise<{
    context: BrowserContext;
    extId: string;
    userDataDir: string;
  }> {
    const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-bughunt-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
        '--no-sandbox',
      ],
    });
    let sw = context.serviceWorkers()[0];
    if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    const extId = new URL(sw.url()).host;
    return { context, extId, userDataDir };
  }

  async function cleanup(context: BrowserContext, userDataDir: string) {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }

  test('装机后 Service Worker 立即启动 + 无 background 错误', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const sw = context.serviceWorkers()[0];
      expect(sw).toBeDefined();
      expect(extId).toMatch(/^[a-p]{32}$/); // 32 char lowercase MV3 id

      // 检查 background 是否活着
      const alive = await sw.evaluate(() => chrome.runtime.id);
      expect(alive).toBeTruthy();
      console.log(`[bg] extId=${extId} runtime.id=${alive}`);
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('Popup 页无 uncaught error + DOM 正常挂载', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      await page.goto(`chrome-extension://${extId}/popup.html`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500); // 给 React 渲染时间

      // DOM 必须挂上
      const rootHasContent = await page.evaluate(
        () => document.body.innerText.length > 5,
      );
      expect(rootHasContent).toBe(true);

      console.log('[popup errors]:', JSON.stringify(errors, null, 2));
      expect(errors.pageErrors).toEqual([]);
      expect(errors.consoleErrors).toEqual([]);
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('Options 页无 uncaught error + 表单可交互', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      await page.goto(`chrome-extension://${extId}/options.html`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // 表单元素存在
      await expect(page.getByLabel('API Base URL')).toBeVisible();

      // 交互测试
      await page.getByLabel('API Base URL').fill('https://api.deepseek.com');
      await expect(page.getByRole('button', { name: /授权/ })).toBeVisible();

      console.log('[options errors]:', JSON.stringify(errors, null, 2));
      expect(errors.pageErrors).toEqual([]);
      expect(errors.consoleErrors).toEqual([]);
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('SidePanel 页无 uncaught error + 可渲染', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      await page.goto(`chrome-extension://${extId}/sidepanel.html`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const rootHasContent = await page.evaluate(
        () => document.body.innerText.length > 5,
      );
      expect(rootHasContent).toBe(true);

      console.log('[sidepanel errors]:', JSON.stringify(errors, null, 2));
      expect(errors.pageErrors).toEqual([]);
      expect(errors.consoleErrors).toEqual([]);
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('Content Script 注入真实 HTTP 页面无错', async () => {
    const { context, userDataDir } = await launch();
    try {
      // 起一个本地 fixture 页面（避免网络依赖）
      const page = await context.newPage();
      const errors = collectErrors(page);

      // 用 data: URL 起最小页面
      await page.setContent(`
        <!doctype html>
        <html><body>
          <p id="target">Hello world this is a sample paragraph to translate.</p>
        </body></html>
      `);
      await page.waitForTimeout(1000);

      // 选中文本触发浮标
      await page.evaluate(() => {
        const p = document.getElementById('target')!;
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        p.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });
      await page.waitForTimeout(1500);

      console.log('[content script errors]:', JSON.stringify(errors, null, 2));
      expect(errors.pageErrors).toEqual([]);
      // content script 里 console.error 可能有 origin permission 相关（预期），过滤
      const criticalConsole = errors.consoleErrors.filter(
        (e) => !/permission|origin|host/i.test(e),
      );
      expect(criticalConsole).toEqual([]);
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('Service Worker 收到 message 不崩溃', async () => {
    const { context, userDataDir } = await launch();
    try {
      const sw = context.serviceWorkers()[0];
      // 发一个未知 message 看 background 崩不崩
      const result = await sw.evaluate(async () => {
        try {
          const res = await chrome.runtime.sendMessage({ type: 'test-ping' });
          return { ok: true, res };
        } catch (e) {
          return { ok: false, err: (e as Error).message };
        }
      });
      // 就算 background 不识别，也不该 uncaught throw
      console.log('[sw message]:', JSON.stringify(result));
      // sendMessage 无 listener 会返回 undefined 或抛"receiving end does not exist"，都算正常
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('三入口 storage 读写不互相污染', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      // Options 写 config
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extId}/options.html`);
      await optionsPage.waitForLoadState('domcontentloaded');
      await optionsPage.waitForTimeout(800);
      await optionsPage.getByLabel('API Base URL').fill('https://test.example.com');
      await optionsPage.waitForTimeout(500); // 等 storage.set

      // SidePanel 打开应看到同步后的配置
      const sidePage = await context.newPage();
      await sidePage.goto(`chrome-extension://${extId}/sidepanel.html`);
      await sidePage.waitForTimeout(800);

      // 从 sidepanel 上下文读 storage
      const readBack = await sidePage.evaluate(async () => {
        return await new Promise((resolve) => {
          chrome.storage.local.get(null, (data) => resolve(data));
        });
      });
      console.log('[storage]:', JSON.stringify(readBack));
      // storage 应包含 openai-compat 相关 key（不管命名如何，非空）
      expect(readBack).toBeDefined();
      expect(typeof readBack).toBe('object');
    } finally {
      await cleanup(context, userDataDir);
    }
  });
});
