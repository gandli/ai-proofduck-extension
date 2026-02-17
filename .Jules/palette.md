## 2025-02-18 - Accessibility Improvements in Sidepanel
**Learning:** Icon-only buttons (Settings, Clear, Copy, etc.) lacked `aria-label` attributes, relying only on `title` which is insufficient for screen readers. Toggle buttons for modes used visual styling but missed `aria-pressed` state. Also, translation keys must be consistent across all languages to pass `i18n` tests.
**Action:** Always add `aria-label` to icon-only buttons using localized strings. Use `aria-pressed` for toggle buttons. Ensure `i18n.ts` has all keys for all languages.
