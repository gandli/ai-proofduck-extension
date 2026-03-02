# Palette's Journal - Critical UX/A11y Learnings

## 2025-02-19 - Accessibility of Icon-Only Buttons
**Learning:** The application heavily relies on icon-only buttons (Settings, Clear, Fetch, Copy, Close) without providing accessible names for screen readers. While `title` attributes were sometimes present, they are not reliably announced by all screen readers and don't provide a good experience for touch users compared to proper ARIA labels.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is present, ideally sourced from the i18n system to ensure accessibility across all supported languages. Added `close_btn` and `fetch_page_content` to `i18n.ts` to support this.

## 2025-03-02 - Form Labels and Custom Select Menus
**Learning:** Custom UI components like the `SettingsPanel` have native `input` and `select` fields but lacked programmatic association with their `label` elements. The `LocalModelSelector` acts as a custom select dropdown but lacked correct ARIA attributes to define its role and state to screen readers.
**Action:** Always associate `<label>` tags with their inputs using `htmlFor` and `id` properties. When building custom dropdown select menus, ensure the toggle button uses `aria-haspopup="listbox"` and `aria-expanded={isOpen}`, the container uses `role="listbox"`, and options use `role="option"` with `aria-selected` to provide parity with native `<select>` elements.
