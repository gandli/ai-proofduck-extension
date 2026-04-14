## 2026-04-14 - Focus states and visual character ARIA attributes
**Learning:** When building custom interactive elements or icon-only buttons, it is critical to include explicit focus indicators like `focus-visible:ring-2` for keyboard users, and hide purely visual characters (like emojis or `×`) with `aria-hidden="true"` to prevent screen reader noise.
**Action:** Always include the trio of title, aria-label, and focus indicators for icon buttons, and wrap visual text characters in aria-hidden spans.
