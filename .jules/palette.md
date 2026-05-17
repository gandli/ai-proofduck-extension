## 2025-05-17 - Semantic Emojis Accessibility
**Learning:** Purely visual icons and emojis inside buttons with text labels (like 📋 Copy or × Close) are often redundantly announced by screen readers.
**Action:** Always wrap such decorative emojis/characters in `<span aria-hidden="true">` to improve the screen reader experience.
