# Palette's Journal - Critical UX/A11y Learnings

## 2025-02-19 - Accessibility of Icon-Only Buttons
**Learning:** The application heavily relies on icon-only buttons (Settings, Clear, Fetch, Copy, Close) without providing accessible names for screen readers. While `title` attributes were sometimes present, they are not reliably announced by all screen readers and don't provide a good experience for touch users compared to proper ARIA labels.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is present, ideally sourced from the i18n system to ensure accessibility across all supported languages. Added `close_btn` and `fetch_page_content` to `i18n.ts` to support this.

## 2025-02-19 - Programmatic Label Associations & Custom Dropdown A11y
**Learning:** For custom-styled forms and textareas (where wrapping the input inside `<label>` is not feasible due to layout constraints), relying solely on visual proximity is insufficient for screen readers and touch target usability. Standard inputs and selects require explicit `htmlFor` and `id` linking. Textareas missing direct labels (e.g., using `<h3>` as a visual label) must use `aria-labelledby`. Custom dropdown components mimicking standard `<select>` behavior fail for screen readers unless properly decorated with `role="listbox"`, `aria-expanded`, and `aria-haspopup`.
**Action:** Always link `<label>` elements to their corresponding inputs/selects using `htmlFor` and `id` to increase touch areas and assist screen readers. Use `aria-labelledby` to explicitly link descriptive headings to textareas. When building custom interactive elements like dropdowns, include the necessary ARIA attributes to accurately reflect their semantic role and current state.
