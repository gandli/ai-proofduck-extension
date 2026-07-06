/**
 * v0.4 权限迁移 E2E · 真实模拟安装扩展，验证 optional_host_permissions 流程
 *
 * 覆盖 4 大验证点：
 *   1. manifest.json 静态权限声明正确（host_permissions 3 项 + optional_host_permissions <all_urls>）
 *   2. 装机后 openai-compat 默认权限：未授权（extension 视角 chrome.permissions.contains 返 false）
 *   3. Options 页填 baseUrl → 出现【授权访问 xxx】按钮 + 黄色警告
 *   4. 清除 baseUrl → 不再显示授权 UI（unknown 状态）
 *
 * 关于"已授权 → ✅"分支的说明：
 *   - Chrome 的 `chrome.permissions.request()` 需要用户手势 + 弹出浏览器原生对话框
 *   - 该对话框不是 JS 层 dialog，Playwright / CDP 均无法拦截
 *   - Playwright 从 Options 页 page.click() 授权按钮也会阻塞在对话框上
 *   - 故授权成功后的 UI 状态由 unit test 覆盖（tests/unit/components/OpenAiCompatSection.spec.tsx
 *     mock hasHostPermission → true 分支），此处不重复测试
 *
 * 与已有 live-extension.spec.ts 的区别：本文件专注 v0.4 (#465) 引入的权限模型迁移。
 *
 * 关键坑：
 *   - launchPersistentContext + headless:false 是唯一路子（MV3 不支持 headless 载扩展）
 *   - 每个 test 独立起浏览器（context 共享会污染 permission 状态）
 */
import { test, expect, chromium } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '..', '..', 'dist', 'chrome-mv3');

async function launchWithExt(): Promise<{
  context: BrowserContext;
  extId: string;
  userDataDir: string;
}> {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'pd-perms-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
    ],
  });

  try {
    let sw = context.serviceWorkers()[0];
    if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    const extId = new URL(sw.url()).host;
    return { context, extId, userDataDir };
  } catch (err) {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
    throw err;
  }
}

async function cleanup(context: BrowserContext, userDataDir: string) {
  await context.close();
  rmSync(userDataDir, { recursive: true, force: true });
}

test.describe('v0.4 权限迁移 (#465)', () => {
  test('manifest.json 静态权限声明正确', async () => {
    const { context, extId, userDataDir } = await launchWithExt();
    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extId}/manifest.json`);
      const raw = await page.locator('pre').innerText();
      const manifest = JSON.parse(raw);

      // 必备域名 3 项（可能顺序不同 → 用 Set 比对）
      expect(new Set(manifest.host_permissions)).toEqual(
        new Set([
          'https://translate.googleapis.com/*',
          'https://huggingface.co/*',
          'https://raw.githubusercontent.com/*',
        ]),
      );
      // 关键：<all_urls> 从 host_permissions 迁到 optional_host_permissions
      expect(manifest.host_permissions).not.toContain('<all_urls>');
      expect(manifest.optional_host_permissions).toEqual(['<all_urls>']);

      // API 权限保留
      expect(manifest.permissions).toEqual(
        expect.arrayContaining(['sidePanel', 'storage', 'activeTab']),
      );
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('装机默认：openai-compat 域名未授权', async () => {
    const { context, extId, userDataDir } = await launchWithExt();
    try {
      // 通过 service worker 上下文查 chrome.permissions.contains
      const sw = context.serviceWorkers()[0];
      const granted = await sw.evaluate(async () => {
        return await new Promise<boolean>((resolve) => {
          chrome.permissions.contains(
            { origins: ['https://api.deepseek.com/*'] },
            (has) => resolve(has),
          );
        });
      });
      expect(granted).toBe(false);

      // 而 3 个必备域名应默认已授权
      const gTranslate = await sw.evaluate(async () => {
        return await new Promise<boolean>((resolve) => {
          chrome.permissions.contains(
            { origins: ['https://translate.googleapis.com/*'] },
            (has) => resolve(has),
          );
        });
      });
      expect(gTranslate).toBe(true);

      console.log(`[perms] extId=${extId} deepseek=${granted} google=${gTranslate}`);
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('Options 页填 baseUrl → 显示【授权访问 xxx】按钮 + 黄色警告', async () => {
    const { context, extId, userDataDir } = await launchWithExt();
    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extId}/options.html`);
      await page.waitForLoadState('domcontentloaded');

      const baseInput = page.getByLabel('API Base URL');
      await baseInput.fill('https://api.deepseek.com');

      const authBtn = page.getByRole('button', { name: /授权.*api\.deepseek\.com/ });
      await expect(authBtn).toBeVisible({ timeout: 5000 });

      await expect(page.getByText(/还没获得访问.*的权限/)).toBeVisible();
    } finally {
      await cleanup(context, userDataDir);
    }
  });

  test('清空 baseUrl → 授权 UI 消失', async () => {
    const { context, extId, userDataDir } = await launchWithExt();
    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extId}/options.html`);
      await page.waitForLoadState('domcontentloaded');

      const baseInput = page.getByLabel('API Base URL');
      await baseInput.fill('https://api.deepseek.com');
      await expect(page.getByRole('button', { name: /授权/ })).toBeVisible();

      await baseInput.fill('');
      await expect(page.getByText(/还没获得访问/)).toHaveCount(0);
      await expect(page.getByText(/✅.*已授权/)).toHaveCount(0);
    } finally {
      await cleanup(context, userDataDir);
    }
  });
});
