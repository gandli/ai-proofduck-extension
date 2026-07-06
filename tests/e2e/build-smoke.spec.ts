/**
 * build-smoke: 打包产物合法性冒烟测试
 *
 * 目的：保证 dist/chrome-mv3/ 包结构可被浏览器加载为 MV3 扩展
 * - manifest_version === 3
 * - 必须的入口文件都在
 * - 图标存在
 *
 * 不测行为，只测「打包出来的东西长得对」——防止 wxt.config 或路径重构把产物打崩。
 */
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '..', '..', 'dist', 'chrome-mv3');

test.describe('build smoke', () => {
  test('manifest.json 是 MV3 且有校对鸭 title', () => {
    const raw = readFileSync(path.join(dist, 'manifest.json'), 'utf-8');
    const m = JSON.parse(raw);
    expect(m.manifest_version).toBe(3);
    expect(m.action?.default_title).toContain('校对鸭');
    expect(m.side_panel?.default_path).toBe('sidepanel.html');
    expect(m.permissions).toContain('sidePanel');
    expect(m.permissions).toContain('storage');
  });

  test('三个 HTML 入口 + service worker + content 都存在', () => {
    const files = [
      'popup.html',
      'sidepanel.html',
      'options.html',
      'background.js',
      'content-scripts/content.js',
    ];
    for (const f of files) {
      expect(existsSync(path.join(dist, f)), `${f} missing`).toBe(true);
    }
  });

  test('鸭子图标齐全（16/32/48/128 PNG）', () => {
    for (const size of [16, 32, 48, 128]) {
      expect(
        existsSync(path.join(dist, 'icons', `icon-${size}.png`)),
        `icon-${size}.png missing`,
      ).toBe(true);
    }
  });
});
