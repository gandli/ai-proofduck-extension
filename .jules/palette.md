## 2026-05-10 - Prevent screen reader redundant emoji announcements
**Learning:** When using purely visual characters (e.g., emojis) inside buttons or headers that already have text labels or an `aria-label`, the visual element should be wrapped in `<span aria-hidden="true">` to prevent screen readers from redundantly or incorrectly announcing it.
**Action:** Always wrap visual emojis in `<span aria-hidden="true">` when they are inside buttons or elements that have visible text labels or `aria-label` attributes.
