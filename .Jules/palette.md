## 2024-05-22 - Icon-Only Button Accessibility
**Learning:** Icon-only buttons (like settings, close, clear) were consistently missing `aria-label` attributes, relying only on `title`. This is a common pattern in the codebase.
**Action:** Always check `App.tsx` and component files for `<button>` elements containing only SVGs and ensure they have `aria-label`. Also, ensure `i18n.ts` keys are consistent across all languages to avoid test failures.
