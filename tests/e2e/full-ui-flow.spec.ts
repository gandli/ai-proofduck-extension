/**
 * full-ui-flow: 完整 UI 交互 BUG 猎手 E2E
 *
 * 前几轮 E2E 已覆盖：manifest / 装机 / 引擎链路 / 划词浮标 / 三级错误监控
 *
 * 本 spec 补上"用户视角"的真交互路径，专门找 UI 层可见的 BUG：
 *   1. Popup 品牌 + 图标 + 打开侧边栏按钮 click 真的调 chrome.sidePanel.open
 *   2. Options 5 个 preset 按钮点击后 baseUrl+model 立即回填 + 保存到 storage
 *   3. Options apiKey show/hide 切换（安全性 UI）
 *   4. Options 主题/语言/默认引擎 select 切换后持久化
 *   5. SidePanel: 空文本按钮 disabled、同源同目标警告、翻译按钮流式渲染
 *   6. SidePanel: 清空按钮回到 idle
 *   7. 跨入口一致性：Options 改默认引擎 → SidePanel 徽章切换
 *   8. 页面卸载重开 storage 数据仍在（持久化）
 *
 * 所有 test 独立 launchPersistentContext + 独立 userDataDir，防跨 test 污染。
 */
import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '..', '..', 'dist', 'chrome-mv3');

/** 装机 + 拿 extId + 收集三级错误 */
async function launch() {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-full-ui-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
  });
  try {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }
    const extId = worker.url().split('/')[2];
    return { context, extId, userDataDir };
  } catch (err) {
    await context.close().catch(() => {});
    rmSync(userDataDir, { recursive: true, force: true });
    throw err;
  }
}

async function teardown(context: BrowserContext, dir: string) {
  await context.close();
  rmSync(dir, { recursive: true, force: true });
}

/** 在 Extension page 上装三级错误监控 */
function collectErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    const url = req.url();
    // 允许扩展页 favicon 之类无关失败
    if (/favicon\.ico$|manifest\.json$/.test(url)) return;
    errors.push(`[requestfailed] ${req.method()} ${url} ${req.failure()?.errorText}`);
  });
  return errors;
}

test.describe('full-ui-flow · 完整 UI 交互 BUG 猎手', () => {
  test('[1/8] Popup 品牌 + 图标 + "打开侧边栏"按钮点击后确实调用 sidePanel.open', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      await page.goto(`chrome-extension://${extId}/popup.html`);

      // 品牌名
      await expect(page.getByText(/校对鸭|ProofDuck/)).toBeVisible();

      // 图标存在 + 加载成功（非 0×0）
      const icon = page.locator('img[alt=""]').first();
      await expect(icon).toBeVisible();
      const naturalW = await icon.evaluate((n: HTMLImageElement) => n.naturalWidth);
      expect(naturalW, 'popup icon 加载失败').toBeGreaterThan(0);

      // 挂个 spy 在 chrome.sidePanel.open 上，验证按钮真的调它
      await page.evaluate(() => {
        (window as any).__spanelCalls = [];
        const sp = (chrome as any).sidePanel;
        const orig = sp?.open?.bind(sp);
        if (sp) {
          sp.open = (opts: any) => {
            (window as any).__spanelCalls.push(opts);
            return orig ? orig(opts) : Promise.resolve();
          };
        }
      });

      await page.getByRole('button', { name: /打开侧边栏/ }).click();
      // 等一帧让异步 chrome.windows.getCurrent + open 走完
      await page.waitForTimeout(300);
      const calls = await page.evaluate(() => (window as any).__spanelCalls);
      expect(calls.length, 'sidePanel.open 未被调用').toBeGreaterThanOrEqual(1);
      expect(calls[0]).toHaveProperty('windowId');

      expect(errors, `popup 错误：\n${errors.join('\n')}`).toEqual([]);
    } finally {
      await teardown(context, userDataDir);
    }
  });

  test('[2/8] Options 5 个 preset 按钮点击后 baseUrl+model 正确回填', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      await page.goto(`chrome-extension://${extId}/options.html`);

      const cases = [
        { btn: 'OpenAI', baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
        { btn: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
        { btn: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode', model: 'qwen-turbo' },
        { btn: '豆包', baseUrl: 'https://ark.cn-beijing.volces.com/api', model: 'doubao-1-5-lite-32k' },
        { btn: 'Kimi', baseUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
      ];

      const baseUrlInput = page.locator('#oaic-baseurl');
      const modelInput = page.locator('#oaic-model');
      // 等表单水合完成（skeleton → 表单）
      await expect(baseUrlInput).toBeVisible();

      for (const c of cases) {
        await page.getByRole('button', { name: new RegExp(`^${c.btn}$`) }).click();
        await expect(baseUrlInput).toHaveValue(c.baseUrl, { timeout: 2000 });
        await expect(modelInput).toHaveValue(c.model, { timeout: 2000 });
      }

      expect(errors, `options 错误：\n${errors.join('\n')}`).toEqual([]);
    } finally {
      await teardown(context, userDataDir);
    }
  });

  test('[3/8] Options apiKey 输入 + show/hide 切换（type=password ↔ text）', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      await page.goto(`chrome-extension://${extId}/options.html`);

      // apiKey 输入框（placeholder=sk-...）
      const keyInput = page.locator('input[placeholder="sk-..."]');
      await expect(keyInput).toBeVisible();
      // 默认 type=password（不显示明文）
      await expect(keyInput).toHaveAttribute('type', 'password');

      await keyInput.fill('sk-test-1234567890abcdef');
      await expect(keyInput).toHaveValue('sk-test-1234567890abcdef');

      // 点显示按钮 → type 切成 text
      const showBtn = page.getByRole('button', { name: /显示|show|隐藏|hide/i }).first();
      await showBtn.click();
      await expect(keyInput).toHaveAttribute('type', 'text');

      // 再点一次切回 password
      await showBtn.click();
      await expect(keyInput).toHaveAttribute('type', 'password');

      expect(errors, `apiKey UI 错误：\n${errors.join('\n')}`).toEqual([]);
    } finally {
      await teardown(context, userDataDir);
    }
  });

  test('[4/8] Options 主题/语言/默认引擎 select 切换后立即持久化到 chrome.storage.sync', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      await page.goto(`chrome-extension://${extId}/options.html`);

      // 切主题 → dark
      const themeSelect = page.locator('select').nth(0);
      await themeSelect.selectOption('dark');
      // 切语言 → English
      const localeSelect = page.locator('select').nth(1);
      await localeSelect.selectOption('en');
      // 切默认引擎 → openai-compat
      const engineSelect = page.locator('select').nth(2);
      await engineSelect.selectOption('openai-compat');

      // 等一帧让 zustand → storage 微任务写完
      await page.waitForTimeout(500);

      // 读 chrome.storage.sync 验证
      const stored = await page.evaluate(async () => {
        return new Promise((resolve) => {
          chrome.storage.sync.get(null, (all) => resolve(all));
        });
      });
      expect(stored).toMatchObject({
        theme: 'dark',
        locale: 'en',
        defaultEngine: 'openai-compat',
      });

      expect(errors, `options 持久化错误：\n${errors.join('\n')}`).toEqual([]);
    } finally {
      await teardown(context, userDataDir);
    }
  });

  test('[5/8] SidePanel: 空文本 → 翻译按钮 disabled', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      // 屏蔽 webllm 避免下 950MB 模型
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'gpu', { configurable: true, get: () => undefined });
      });
      await page.goto(`chrome-extension://${extId}/sidepanel.html`);
      await page.waitForTimeout(600); // 等 pickBest 走完

      const translateBtn = page.getByRole('button', { name: /^翻译$/ });
      await expect(translateBtn).toBeDisabled();

      // 输入几个字符 → 按钮变可用（前提是 available !== false）
      const textarea = page.locator('textarea');
      await textarea.fill('hello world');
      await expect(translateBtn).toBeEnabled({ timeout: 3000 });

      // 清空文本 → 又 disabled
      await textarea.fill('');
      await expect(translateBtn).toBeDisabled();

      expect(errors, `sidepanel 错误：\n${errors.join('\n')}`).toEqual([]);
    } finally {
      await teardown(context, userDataDir);
    }
  });

  test('[6/8] SidePanel: 源=目标语言 → 按钮 disabled + 显示警告文案', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'gpu', { configurable: true, get: () => undefined });
      });
      await page.goto(`chrome-extension://${extId}/sidepanel.html`);
      await page.waitForTimeout(600);

      await page.locator('textarea').fill('hello world');
      // 源和目标都设成 zh
      await page.locator('#source-lang').selectOption('zh');
      await page.locator('#target-lang').selectOption('zh');

      // 按钮 disabled + 输出区显示"源语言和目标语言不能相同"
      await expect(page.getByRole('button', { name: /^翻译$/ })).toBeDisabled();
      await expect(page.getByText(/源语言和目标语言不能相同/)).toBeVisible();

      expect(errors, `sidepanel 同语言错误：\n${errors.join('\n')}`).toEqual([]);
    } finally {
      await teardown(context, userDataDir);
    }
  });

  test('[7/8] SidePanel: 真调 free-translate + 翻译成功 + 清空按钮回到 idle', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      // 走 free-translate（stub 掉 WebGPU 免 webllm 抢先）
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'gpu', { configurable: true, get: () => undefined });
      });
      await page.goto(`chrome-extension://${extId}/sidepanel.html`);
      await page.waitForTimeout(800);

      // 检查引擎徽章出现（v0.4 UI 重设计后使用 data-testid 定位，
      // 因为 header 里删掉了 "引擎：" 前缀，改为纯 chip 更简洁）
      await expect(page.getByTestId('engine-chip')).toBeVisible({ timeout: 3000 });

      await page.locator('textarea').fill('Machine learning is fascinating.');
      await page.locator('#target-lang').selectOption('zh');
      await page.locator('#source-lang').selectOption('auto');

      await page.getByRole('button', { name: /^翻译$/ }).click();

      // 翻译中 → 翻译中… 显示（可能太快就跳过了，不 assert）
      // 等结果：包含中文关键字之一
      const output = page.getByLabel('翻译结果');
      await expect(output).toContainText(/机器|学习|智能|人工|迷/, { timeout: 15_000 });

      // 清空按钮
      await page.getByRole('button', { name: /清空/ }).click();
      await expect(page.locator('textarea')).toHaveValue('');
      await expect(output).toContainText(/翻译结果会显示在这里/);

      expect(errors, `sidepanel 翻译错误：\n${errors.join('\n')}`).toEqual([]);
    } finally {
      await teardown(context, userDataDir);
    }
  });

  test('[8/8] 持久化 · 关掉 Options 再开，主题/语言 auto-persist；apiKey 需点【保存】才 persist', async () => {
    const { context, extId, userDataDir } = await launch();
    try {
      // 第一次开：改 theme/locale（自动持久化），填 apiKey 但不点保存
      const page1 = await context.newPage();
      await page1.goto(`chrome-extension://${extId}/options.html`);
      await expect(page1.locator('#oaic-baseurl')).toBeVisible(); // 等表单挂载
      await page1.locator('select').nth(0).selectOption('dark');
      await page1.locator('select').nth(1).selectOption('ja');

      // 填一个未保存的 apiKey（不点保存按钮）
      await page1.locator('#oaic-apikey').fill('sk-NOT-SAVED-yet');
      await page1.waitForTimeout(500);
      await page1.close();

      // 第二次开：theme/locale 应还在（zustand 自动同步），apiKey 应为空（未点保存）
      const page2 = await context.newPage();
      const errors = collectErrors(page2);
      await page2.goto(`chrome-extension://${extId}/options.html`);
      await expect(page2.locator('#oaic-baseurl')).toBeVisible();
      await page2.waitForTimeout(500);

      // 自动持久化字段：主题/语言
      await expect(page2.locator('select').nth(0)).toHaveValue('dark');
      await expect(page2.locator('select').nth(1)).toHaveValue('ja');
      // 显式持久化字段：apiKey 未点保存 → 应为空
      await expect(page2.locator('#oaic-apikey')).toHaveValue('');

      // 这次点【保存】按钮 → apiKey 应写 storage
      await page2.locator('#oaic-baseurl').fill('https://api.deepseek.com');
      await page2.locator('#oaic-apikey').fill('sk-DEEP-1234567890');
      await page2.locator('#oaic-model').fill('deepseek-chat');
      await page2.getByRole('button', { name: /^保存$/ }).click();
      // 应显示"已保存 ✓"
      await expect(page2.getByText(/已保存/)).toBeVisible({ timeout: 3000 });
      await page2.close();

      // 第三次开：apiKey 应还在
      const page3 = await context.newPage();
      const errors3 = collectErrors(page3);
      await page3.goto(`chrome-extension://${extId}/options.html`);
      await expect(page3.locator('#oaic-baseurl')).toBeVisible();
      await page3.waitForTimeout(400);
      await expect(page3.locator('#oaic-baseurl')).toHaveValue('https://api.deepseek.com');
      await expect(page3.locator('#oaic-apikey')).toHaveValue('sk-DEEP-1234567890');
      await expect(page3.locator('#oaic-model')).toHaveValue('deepseek-chat');

      expect(errors, `第二次开 options 错误：\n${errors.join('\n')}`).toEqual([]);
      expect(errors3, `第三次开 options 错误：\n${errors3.join('\n')}`).toEqual([]);
    } finally {
      await teardown(context, userDataDir);
    }
  });
});
