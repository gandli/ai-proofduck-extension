import { test, expect } from '@playwright/test';

test.describe('Landing page (gh-pages)', () => {
  test('EN page renders key sections + back-to-top button', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('section#screenshots')).toBeVisible();
    await expect(page.locator('section#features')).toBeVisible();
    await expect(page.locator('section#engines')).toBeVisible();
    await expect(page.locator('section#changelog')).toBeVisible();

    const topBtn = page.locator('#backToTopBtn');
    await expect(topBtn).toBeVisible();
    await expect(topBtn).toHaveClass(/opacity-0/);

    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect(topBtn).not.toHaveClass(/opacity-0/);
  });

  test('language switch keeps section context (no jump to changelog)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#features').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);

    await page.getByRole('button', { name: '中文' }).click();
    await expect(page).toHaveURL(/\/zh\//);

    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).not.toBe('#changelog');

    const y = await page.evaluate(() => window.scrollY);
    expect(y).toBeGreaterThan(100);
  });

  test('zh locale shows Chinese engine copy', async ({ page }) => {
    await page.goto('/zh/');

    await expect(page.locator('section#engines')).toContainText('三大 AI 与翻译引擎');
    await expect(page.locator('section#engines')).toContainText('Chrome 内置 AI');
    await expect(page.locator('section#engines')).toContainText('公共翻译与 API');
  });

  test('dynamic changelog supports markdown rendering in EN', async ({ page }) => {
    await page.route('https://raw.githubusercontent.com/gandli/ai-proofduck-extension/main/CHANGELOG.md', async (route) => {
      const body = `# Changelog\n\n## [v0.1.6] - 2026-03-03\n\n### Added\n- **Release automation upgrade** for \`workflow_dispatch\`\n- [Docs](https://example.com/docs) updated\n\n### Changed\n- Move multilingual docs\n\n### Fixed\n- i18n regression\n`;
      await route.fulfill({
        status: 200,
        contentType: 'text/markdown',
        body,
      });
    });

    await page.goto('/');

    const changelog = page.locator('#changelog-content');
    await expect(changelog.locator('strong', { hasText: 'Release automation upgrade' })).toBeVisible();
    await expect(changelog.locator('code', { hasText: 'workflow_dispatch' })).toBeVisible();
    await expect(changelog.locator('a[href="https://example.com/docs"]')).toBeVisible();
  });
});
