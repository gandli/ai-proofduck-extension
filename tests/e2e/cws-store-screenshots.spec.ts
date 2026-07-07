/**
 * Chrome Web Store 商店截图生成器 · v0.5.2
 *
 * 策略：
 * - 1280×800 · CWS 强制尺寸
 * - 左：v0.5.2 真实 sidepanel 截图（从扩展加载）
 * - 右：产品卖点文案（品牌米金 + 樱粉）
 * - 亮暗各一套 → 6 张
 *
 * 用 Playwright 起 chromium.launchPersistentContext 加载真实扩展，
 * 打开 sidepanel URL 截图后合成到 1280×800 画布。
 */
import { test, chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '..', '..', 'dist', 'chrome-mv3');
const OUT = path.resolve(__dirname, '..', '..', 'store-assets', 'v0.5.2');
fs.mkdirSync(OUT, { recursive: true });

test.describe.configure({ mode: 'serial' });

// 6 个卖点场景
type Scene = {
  slug: string;
  title: string;
  subtitle: string;
  color: 'light' | 'dark';
  panel: 'sidepanel' | 'popup' | 'options';
};

const SCENES: Scene[] = [
  { slug: '1-hero-light', title: '选中即翻译', subtitle: '弹泡 · 侧边栏 · 快捷键三合一', color: 'light', panel: 'sidepanel' },
  { slug: '2-dark-mode', title: '深色模式跟随系统', subtitle: '温和护眼 · v0.5.0', color: 'dark', panel: 'sidepanel' },
  { slug: '3-engines', title: '四大引擎融合', subtitle: 'Chrome AI · WebLLM · OpenAI · 免费', color: 'light', panel: 'options' },
  { slug: '4-popup', title: '弹泡即翻', subtitle: '选中文字自动出现浮标', color: 'light', panel: 'popup' },
  { slug: '5-shortcut', title: '键盘全流程', subtitle: 'Alt+Shift+P · focus-visible', color: 'light', panel: 'sidepanel' },
  { slug: '6-privacy', title: '零数据上传', subtitle: 'API Key 只存本地 · 完全开源', color: 'light', panel: 'sidepanel' },
];

test.describe('CWS store screenshots · 1280×800 · v0.5.2', () => {
  test.setTimeout(120_000);
  for (const scene of SCENES) {
    test(`${scene.slug}`, async () => {
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-cws-'));
      const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
          `--disable-extensions-except=${EXT_PATH}`,
          `--load-extension=${EXT_PATH}`,
          '--no-first-run',
        ],
        viewport: { width: 1280, height: 800 },
        colorScheme: scene.color,
      });

      try {
        // 找到扩展 ID
        let sw = context.serviceWorkers()[0];
        if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 8000 });
        const extId = sw.url().match(/chrome-extension:\/\/([a-z]+)/i)![1];

        // 打开对应面板 · popup 用真实小尺寸避免空白
        const panelUrl = `chrome-extension://${extId}/${scene.panel}.html`;
        const panelPage = await context.newPage();
        await panelPage.setViewportSize({
          width: scene.panel === 'options' ? 960 : scene.panel === 'popup' ? 320 : 420,
          height: scene.panel === 'options' ? 760 : scene.panel === 'popup' ? 340 : 720,
        });
        await panelPage.goto(panelUrl);
        await panelPage.waitForTimeout(700);

        // 拿到 panel 截图
        const panelBuf = await panelPage.screenshot({ type: 'png' });
        const panelB64 = panelBuf.toString('base64');
        await panelPage.close();

        // 合成页面：1280×800 canvas · 左文案 + 右扩展面板
        const composer = await context.newPage();
        const bg = scene.color === 'dark' ? '#14100B' : '#FDFAF2';
        const fg = scene.color === 'dark' ? '#FDFAF2' : '#33291D';
        const accent = '#C89A3E';
        const pink = '#F5C3B8';

        await composer.setViewportSize({ width: 1280, height: 800 });
        await composer.setContent(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  html,body{margin:0;padding:0;width:1280px;height:800px;overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Segoe UI',sans-serif;
    background:${bg};color:${fg};}
  .frame{display:flex;align-items:center;justify-content:space-between;
    padding:0 80px;height:800px;box-sizing:border-box;}
  .copy{width:520px;}
  .badge{display:inline-block;background:${pink};color:#7A2E20;
    padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;
    letter-spacing:.02em;margin-bottom:24px;}
  h1{font-size:56px;line-height:1.1;font-weight:800;margin:0 0 22px;
    letter-spacing:-.02em;color:${fg};}
  h1 em{font-style:normal;color:${accent};}
  p.sub{font-size:22px;line-height:1.5;font-weight:500;
    color:${scene.color === 'dark' ? '#B8AA8E' : '#5A4C36'};margin:0 0 32px;}
  .cta{display:inline-flex;align-items:center;gap:8px;
    background:${accent};color:#FFF;padding:12px 22px;border-radius:14px;
    font-weight:700;font-size:16px;box-shadow:0 6px 18px rgba(200,154,62,.35);}
  .panel-wrap{background:${scene.color === 'dark' ? '#33291D' : '#FFF'};
    border-radius:18px;padding:14px;
    box-shadow:0 20px 60px rgba(0,0,0,.15),0 3px 8px rgba(0,0,0,.08);
    display:flex;align-items:center;justify-content:center;}
  .panel-wrap img{display:block;border-radius:10px;
    max-width:100%;max-height:640px;height:auto;width:auto;
    box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .brand{position:absolute;top:36px;left:80px;
    display:flex;align-items:center;gap:10px;
    font-weight:700;font-size:18px;color:${accent};}
</style></head>
<body>
  <div class="brand">
    <span style="width:28px;height:28px;background:${accent};
      border-radius:8px;display:inline-block"></span>
    校对鸭 · Proofduck
  </div>
  <div class="frame">
    <div class="copy">
      <span class="badge">v0.5.2 · AI 翻译 · MV3</span>
      <h1>${scene.title.replace(/(即|模式|融合|翻|流程|上传)/, '<em>$1</em>')}</h1>
      <p class="sub">${scene.subtitle}</p>
      <div class="cta">立即安装 · Chrome Web Store</div>
    </div>
    <div class="panel-wrap">
      <img src="data:image/png;base64,${panelB64}" />
    </div>
  </div>
</body></html>`);
        await composer.waitForTimeout(300);
        const outPath = path.join(OUT, `screenshot-${scene.slug}.png`);
        await composer.screenshot({ path: outPath, fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 800 } });
        console.log(`[cws] ${outPath}`);
      } finally {
        await context.close();
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    });
  }
});
