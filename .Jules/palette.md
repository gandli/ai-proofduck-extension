# Palette's Journal

## 2026-03-03 - Custom Dropdown ARIA Accessibility
**Learning:** Custom components like LocalModelSelector acting as dropdowns require explicit `role="combobox"`, `aria-expanded`, `aria-haspopup", and `aria-controls` on the trigger, along with a linked `id`, `role="listbox"` on the container, and `role="option"` with `aria-selected` on items. This ensures screen reader users understand the component is a select input and can navigate its options correctly.
**Action:** Whenever building custom select inputs, verify ARIA attributes mimic native `<select>` behavior closely to maintain keyboard and screen reader accessibility.
