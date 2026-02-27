# Palette's Journal - Critical UX/A11y Learnings

## 2025-02-19 - Accessibility of Icon-Only Buttons
**Learning:** The application heavily relies on icon-only buttons (Settings, Clear, Fetch, Copy, Close) without providing accessible names for screen readers. While `title` attributes were sometimes present, they are not reliably announced by all screen readers and don't provide a good experience for touch users compared to proper ARIA labels.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is present, ideally sourced from the i18n system to ensure accessibility across all supported languages. Added `close_btn` and `fetch_page_content` to `i18n.ts` to support this.
