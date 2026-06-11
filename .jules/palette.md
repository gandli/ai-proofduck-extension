## 2024-06-11 - Fixed i18n accessibility string
**Learning:** Hardcoding accessibility strings like `aria-label="清空输入"` breaks localization and screen readers. We should use translation functions like `t('clear')` instead.
**Action:** Always verify that ARIA labels and other accessible descriptions use the same `t()` translation function as visible text strings to ensure consistent localization.
## 2024-06-11 - CI workflow artifact paths
**Learning:** The WXT project builds outputs to `.output/chrome-mv3/` instead of `.output/chrome-mv3-prod/`. Incorrect paths in CI workflows cause `upload-artifact` step failures (exit code 1).
**Action:** When working on GitHub Actions configurations, always verify that the artifact upload and download paths correspond to the actual build output directories used by the current project build tool setup.
