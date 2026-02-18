import { test, expect } from '@playwright/test';

const BASE_URL = `file://${process.cwd()}/index.html`;

// Key i18n pairs to verify hydration (actual translated content)
const HYDRATION_CHECKS = {
  en: {
    hero_title: 'AI Proofduck',
    hero_tagline: 'Smart Writing Assistant · Privacy First',
    hero_badge: 'In-Browser AI · Local Inference',
    hero_cta: 'Add to Chrome',
    feat_h: 'Five Smart Modes',
    f1t: 'Summarize', f2t: 'Correct', f3t: 'Polish', f4t: 'Translate', f5t: 'Expand',
    how_h: 'Three Simple Steps',
    s1t: 'Select Text', s2t: 'Choose Mode', s3t: 'Get Results',
    eng_h: 'Three Inference Engines',
    priv_h: 'Privacy Policy',
    priv_date: 'Last Updated: February 2026',
    nav_features: 'Features', nav_engines: 'Engines', nav_screenshots: 'Screenshots', nav_privacy: 'Privacy',
    pd1h: 'Data Collection Statement',
    pd7h: 'Contact Us',
    pd3h: "What We Don't Collect",
    pd4h: 'Browser Permissions',
    pd5h: "Data Retention & Your Rights",
  },
  zh: {
    hero_title: 'AI 校对鸭',
    hero_tagline: '智能写作助手 · 隐私优先',
    hero_badge: '浏览器内置 AI · 本地推理',
    hero_cta: '安装到 Chrome',
    feat_h: '五种智能模式',
    f1t: '内容摘要', f2t: '语法纠错', f3t: '文本润色', f4t: '智能翻译', f5t: '内容扩写',
    how_h: '简单三步',
    s1t: '选择文本', s2t: '选择模式', s3t: '获取结果',
    eng_h: '三大推理引擎',
    priv_h: '隐私政策',
    priv_date: '最后更新：2026年2月',
    nav_features: '功能特性', nav_engines: '推理引擎', nav_screenshots: '产品截图', nav_privacy: '隐私政策',
    pd1h: '数据收集声明',
    pd2h: 'API 与模型安全',
    pd3h: '浏览器权限说明',
    pd4h: '数据保留',
    pd5h: '用户权利',
    pd6h: '第三方服务',
    pd7h: '联系我们',
  },
};

test.describe('Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Default language is Chinese', async ({ page }) => {
    const zhBtn = page.locator('.lang-btn', { hasText: '中文' });
    await expect(zhBtn).toHaveClass(/active/);
    await expect(page.locator('[data-i18n="hero_title"]')).toHaveText('AI 校对鸭');
  });

  test('Switch to English and verify all key texts hydrate', async ({ page }) => {
    await page.locator('.lang-btn', { hasText: 'EN' }).click();
    await expect(page.locator('.lang-btn', { hasText: 'EN' })).toHaveClass(/active/);

    // Verify html lang attribute
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Verify page title
    const title = await page.title();
    expect(title).toContain('AI Proofduck');

    // Verify every key i18n node has the correct English text
    for (const [key, expectedText] of Object.entries(HYDRATION_CHECKS.en)) {
      const el = page.locator(`[data-i18n="${key}"]`).first();
      await expect(el, `EN hydration failed for key "${key}"`).toHaveText(expectedText);
    }
  });

  test('Switch to English then back to Chinese — full hydration', async ({ page }) => {
    // EN
    await page.locator('.lang-btn', { hasText: 'EN' }).click();
    await expect(page.locator('[data-i18n="hero_title"]')).toHaveText('AI Proofduck');

    // Back to ZH
    await page.locator('.lang-btn', { hasText: '中文' }).click();
    await expect(page.locator('.lang-btn', { hasText: '中文' })).toHaveClass(/active/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');

    const title = await page.title();
    expect(title).toContain('AI 校对鸭');

    for (const [key, expectedText] of Object.entries(HYDRATION_CHECKS.zh)) {
      const el = page.locator(`[data-i18n="${key}"]`).first();
      await expect(el, `ZH hydration failed for key "${key}"`).toHaveText(expectedText);
    }
  });

  test('Rapid language toggle does not leave stale text', async ({ page }) => {
    // Toggle quickly 3 times
    for (let i = 0; i < 3; i++) {
      await page.locator('.lang-btn', { hasText: 'EN' }).click();
      await page.locator('.lang-btn', { hasText: '中文' }).click();
    }
    // Should be ZH after even number of toggles
    await expect(page.locator('[data-i18n="hero_title"]')).toHaveText('AI 校对鸭');
    await expect(page.locator('[data-i18n="feat_h"]')).toHaveText('五种智能模式');
    await expect(page.locator('[data-i18n="eng_h"]')).toHaveText('三大推理引擎');
    await expect(page.locator('[data-i18n="priv_h"]')).toHaveText('隐私政策');
  });

  test('Feature cards hydrate correctly in English', async ({ page }) => {
    await page.locator('.lang-btn', { hasText: 'EN' }).click();
    const cards = page.locator('#features .feature-card');
    const expected = [
      { title: 'Summarize', desc: /Extract key points/i },
      { title: 'Correct', desc: /spelling.*grammar.*punctuation/i },
      { title: 'Polish', desc: /Refine expressions/i },
      { title: 'Translate', desc: /Smart multilingual/i },
      { title: 'Expand', desc: /Extend brief content/i },
    ];
    for (let i = 0; i < 5; i++) {
      await expect(cards.nth(i).locator('h3')).toHaveText(expected[i].title);
      await expect(cards.nth(i).locator('p')).toHaveText(expected[i].desc);
    }
  });

  test('Privacy cards hydrate correctly in English', async ({ page }) => {
    await page.locator('.lang-btn', { hasText: 'EN' }).click();
    const titles = page.locator('#privacy .p-card h3');
    const expectedTitles = [
      'Data Collection Statement',
      'API & Model Security',
      "What We Don't Collect",
      'Browser Permissions',
      "Data Retention & Your Rights",
      'Third-Party Services',
      'Contact Us',
    ];
    await expect(titles).toHaveCount(7);
    for (let i = 0; i < 7; i++) {
      await expect(titles.nth(i)).toHaveText(expectedTitles[i]);
    }
  });

  test('Engine cards hydrate correctly in English', async ({ page }) => {
    await page.locator('.lang-btn', { hasText: 'EN' }).click();
    const engines = page.locator('#engines .engine-card');
    // Engine names (WebGPU/WASM/Online API) stay the same, check descriptions
    await expect(engines.nth(0).locator('p')).toHaveText(/GPU.*accelerated/i);
    await expect(engines.nth(1).locator('p')).toHaveText(/CPU.*inference/i);
    await expect(engines.nth(2).locator('p')).toHaveText(/OpenAI.*compatible/i);
    // Privacy badges
    await expect(engines.nth(0).locator('.privacy-badge')).toContainText(/Fully Local/i);
    await expect(engines.nth(2).locator('.privacy-badge')).toContainText(/User Controlled/i);
  });

  test('Workflow steps hydrate correctly in English', async ({ page }) => {
    await page.locator('.lang-btn', { hasText: 'EN' }).click();
    const steps = page.locator('.step-card');
    await expect(steps.nth(0).locator('h3')).toHaveText('Select Text');
    await expect(steps.nth(1).locator('h3')).toHaveText('Choose Mode');
    await expect(steps.nth(2).locator('h3')).toHaveText('Get Results');
    // Descriptions too
    await expect(steps.nth(0).locator('p')).toHaveText(/Highlight any text/i);
    await expect(steps.nth(1).locator('p')).toHaveText(/sidebar/i);
    await expect(steps.nth(2).locator('p')).toHaveText(/AI processes instantly/i);
  });
});
