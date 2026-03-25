import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const workspaceRoot = resolve(new URL('..', import.meta.url).pathname);
const mode = process.argv.includes('--dev') ? 'dev' : 'prod';
const extensionDir = resolve(
  workspaceRoot,
  mode === 'dev' ? 'dist/chrome-mv3-dev' : 'dist/chrome-mv3',
);
const manifestPath = resolve(extensionDir, 'manifest.json');
const profileDir = resolve(workspaceRoot, '.tmp', `chrome-${mode}-profile`);
const chromeBinary =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const startUrl =
  mode === 'dev'
    ? 'chrome://extensions/'
    : 'chrome-extension://lpfkhijjjhbcbbllnmdnahiooodajcim/sidepanel.html';

if (!existsSync(chromeBinary)) {
  console.error(`找不到 Chrome：${chromeBinary}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) {
  console.error(`找不到扩展清单：${manifestPath}`);
  console.error(
    mode === 'dev'
      ? '请先运行 bun dev，并确认开发产物已经生成。'
      : '请先运行 bun run build。',
  );
  process.exit(1);
}

mkdirSync(dirname(profileDir), { recursive: true });

const child = spawn(
  chromeBinary,
  [
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    startUrl,
  ],
  {
    detached: true,
    stdio: 'ignore',
  },
);

child.unref();

console.log(`已启动 Chrome，并加载扩展目录：${extensionDir}`);
console.log(`打开页面：${startUrl}`);
