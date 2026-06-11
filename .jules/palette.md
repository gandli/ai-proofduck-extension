## 2024-06-11 - Fixed i18n accessibility string
**Learning:** Hardcoding accessibility strings like `aria-label="清空输入"` breaks localization and screen readers. We should use translation functions like `t('clear')` instead.
**Action:** Always verify that ARIA labels and other accessible descriptions use the same `t()` translation function as visible text strings to ensure consistent localization.
