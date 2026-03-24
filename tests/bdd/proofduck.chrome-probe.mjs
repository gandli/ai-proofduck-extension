import path from 'node:path';

import { probeChromeExtensionPage } from './browser-session.mjs';

async function main() {
  const rootDir = process.cwd();
  const extensionPath = path.join(rootDir, 'dist', 'chrome-mv3');
  const result = await probeChromeExtensionPage({ extensionPath });

  if (result.ok) {
    console.log('CHROME PROBE OK');
    console.log(result.message);
    return;
  }

  console.log('CHROME PROBE BLOCKED');
  console.log(`原因：${result.message}`);

  if (result.blocked) {
    console.log('结论：这台机器上的 Chrome 正式版当前会拦自动化直开扩展页。');
    console.log('建议：日常真实回归请改用 bun run test:bdd 或 bun run test:real，它们默认走单个 Chromium 实例。');
    return;
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
