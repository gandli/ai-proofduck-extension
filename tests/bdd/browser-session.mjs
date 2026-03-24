import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { chromium } from 'playwright';

export const EXTENSION_ID = 'lpfkhijjjhbcbbllnmdnahiooodajcim';

export async function gotoWithRetry(page, url, attempts = 4, timeout = 15000) {
  let lastError = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout });
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(400);
    }
  }

  throw lastError;
}

export async function launchExtensionContext({
  browser = 'chromium',
  extensionPath,
  headless = true,
  enableWebGpu = false,
  label = 'proofduck',
}) {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), `${label}-${browser}-`));
  const args = [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ];

  if (enableWebGpu) {
    args.unshift('--enable-unsafe-webgpu', '--ignore-gpu-blocklist');
  } else {
    args.unshift('--disable-webgpu');
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    ...(browser === 'chrome' ? { channel: 'chrome' } : {}),
    args,
  });

  return {
    context,
    browserName: browser,
    userDataDir,
  };
}

export async function cleanupExtensionContext(context, userDataDir) {
  if (context) {
    await context.close();
  }

  if (userDataDir) {
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

export async function openExtensionSidepanel(context, extensionId = EXTENSION_ID) {
  const sidepanel = await context.newPage();
  await gotoWithRetry(sidepanel, `chrome-extension://${extensionId}/sidepanel.html`, 8, 20000);
  await sidepanel.waitForLoadState('networkidle');
  return sidepanel;
}

export async function probeChromeExtensionPage({ extensionPath, extensionId = EXTENSION_ID }) {
  let launched = null;

  try {
    launched = await launchExtensionContext({
      browser: 'chrome',
      extensionPath,
      headless: true,
      enableWebGpu: false,
      label: 'proofduck-chrome-probe',
    });

    const sidepanel = await openExtensionSidepanel(launched.context, extensionId);
    await sidepanel.close();

    return {
      ok: true,
      browserName: 'chrome',
      blocked: false,
      message: 'Chrome 正式版当前可以直接打开扩展页。',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const blocked = message.includes('ERR_BLOCKED_BY_CLIENT');

    return {
      ok: false,
      browserName: 'chrome',
      blocked,
      message,
    };
  } finally {
    await cleanupExtensionContext(launched?.context ?? null, launched?.userDataDir ?? '');
  }
}
