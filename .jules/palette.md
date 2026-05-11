## 2026-05-11 - Screen Reader Accessibility for Visual Characters
**Learning:** When using purely visual characters (e.g., emojis or '×') inside buttons or headers that already have text labels or an `aria-label`, screen readers might redundantly or incorrectly announce them, degrading the user experience.
**Action:** Wrap such purely visual elements in `<span aria-hidden="true">` to ensure they are ignored by screen readers, and verify that the interactive element has an appropriate accessible name (e.g., via `aria-label`).
