<<<<<<< HEAD
# Palette's Journal

## 2026-03-03 - Custom Dropdown ARIA Accessibility
**Learning:** Custom components like LocalModelSelector acting as dropdowns require explicit `role="combobox"`, `aria-expanded`, `aria-haspopup", and `aria-controls` on the trigger, along with a linked `id`, `role="listbox"` on the container, and `role="option"` with `aria-selected` on items. This ensures screen reader users understand the component is a select input and can navigate its options correctly.
**Action:** Whenever building custom select inputs, verify ARIA attributes mimic native `<select>` behavior closely to maintain keyboard and screen reader accessibility.
=======
## 2025-03-04 - WAI-ARIA Combobox Attributes for Custom Dropdowns
**Learning:** Custom dropdown components, such as `LocalModelSelector`, need explicit WAI-ARIA attributes to ensure screen readers can understand and navigate their state. Without these, screen reader users might not know the control expands, what it controls, or which option is currently selected.
**Action:** When building custom `select` or `dropdown` components, implement the combobox pattern: `role="combobox"`, `aria-expanded`, `aria-haspopup`, `aria-controls` on the trigger, `role="listbox"` on the list container, and `role="option"` with `aria-selected` on individual items.
>>>>>>> palette/combobox-a11y-4647762203256263422
## 2026-03-08 - Explicit Form Controls & Custom Focus Outline
**Learning:** For accessibility, form labels must explicitly use `htmlFor` connected to corresponding control `id`s. Also, any element (like a combobox) that strips the browser's default outline using `focus:outline-none` must substitute it with a visible custom focus state (e.g., `focus-visible:ring-2`) so keyboard navigators aren't lost.
**Action:** Always link labels to inputs with IDs, and ensure `focus:outline-none` is paired with `focus-visible:ring-...` styles.
