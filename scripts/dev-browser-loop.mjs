import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { chromium } from 'playwright';

import { openExtensionSidepanel, resolveExtensionId } from '../tests/bdd/browser-session.mjs';

const rootDir = process.cwd();
const extensionPath = path.join(rootDir, 'dist', 'chrome-mv3-dev');
const manifestPath = path.join(extensionPath, 'manifest.json');
const sampleText = '选中这段文字后，悬停小鸭子，检查页内翻译卡片和侧边栏是否同步。';

let devProcess = null;
let server = null;
let context = null;
let userDataDir = null;

function log(message) {
  console.log(`[dev-browser] ${message}`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isLocalhostReady() {
  return new Promise((resolve) => {
    const request = http.get('http://127.0.0.1:3000', () => {
      request.destroy();
      resolve(true);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1200, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function ensureDevBuildReady() {
  const maxAttempts = 120;

  for (let index = 0; index < maxAttempts; index += 1) {
    const [manifestReady, serverReady] = await Promise.all([
      pathExists(manifestPath),
      isLocalhostReady(),
    ]);

    if (manifestReady && serverReady) {
      return;
    }

    await wait(1000);
  }

  throw new Error('开发产物还没准备好。请确认 bun dev 已经正常启动。');
}

async function startDevServerIfNeeded() {
  const alreadyReady = (await pathExists(manifestPath)) && (await isLocalhostReady());
  if (alreadyReady) {
    log('复用现有 bun dev。');
    return;
  }

  log('启动 bun dev。');
  devProcess = spawn('bun', ['run', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  devProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[dev-browser] bun dev 已退出，状态码：${code}`);
    }
  });

  await ensureDevBuildReady();
}

async function startSampleServer() {
  server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="utf-8" />
          <title>校对鸭开发测试页</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 32px;
              line-height: 1.8;
              color: #1f2937;
            }
            .card {
              max-width: 760px;
              margin: 0 auto;
              padding: 24px 28px;
              border-radius: 20px;
              background: linear-gradient(180deg, #fffaf5 0%, #ffffff 100%);
              box-shadow: 0 20px 50px rgba(255, 90, 17, 0.08);
            }
            h1 {
              margin: 0 0 12px;
              color: #ff5a11;
              font-size: 28px;
            }
            p {
              font-size: 18px;
            }
            .hint {
              margin-top: 20px;
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>校对鸭开发测试页</h1>
            <p id="sample">${sampleText}</p>
            <p>你可以边改代码边验证：侧边栏、页内悬停翻译卡片、选区导入、抓取正文。</p>
            <p class="hint">如果修改了内容脚本但页面没有自动刷新，按浏览器里的 Alt+R 重新加载开发扩展。</p>
          </div>
        </body>
      </html>
    `);
  });

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve(undefined)));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('开发测试页启动失败。');
  }

  return `http://127.0.0.1:${address.port}/`;
}

async function launchBrowser(sampleUrl) {
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proofduck-dev-browser-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--enable-unsafe-webgpu',
      '--ignore-gpu-blocklist',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    viewport: { width: 1440, height: 960 },
  });

  const extensionId = await resolveExtensionId(context);
  const sidepanel = await openExtensionSidepanel(context, extensionId);
  const page = await context.newPage();
  await page.goto(sampleUrl, { waitUntil: 'networkidle' });

  log('开发浏览器已就绪。');
  log(`开发扩展 ID：${extensionId}`);
  log(`侧边栏：chrome-extension://${extensionId}/sidepanel.html`);
  log(`测试页：${sampleUrl}`);
  log('现在可以一边改代码，一边在这个浏览器里直接验证。');
  log('结束时按 Ctrl+C。');

  await sidepanel.bringToFront();
}

async function cleanup() {
  if (context) {
    await context.close().catch(() => {});
  }

  if (userDataDir) {
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }

  if (server) {
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }

  if (devProcess && !devProcess.killed) {
    devProcess.kill('SIGTERM');
  }
}

async function main() {
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  await startDevServerIfNeeded();
  const sampleUrl = await startSampleServer();
  await launchBrowser(sampleUrl);

  await new Promise(() => {});
}

main().catch(async (error) => {
  console.error(`[dev-browser] ${error instanceof Error ? error.message : String(error)}`);
  await cleanup();
  process.exit(1);
});
