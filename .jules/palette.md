## 2024-05-24 - Accessibility for visual elements in buttons
**Learning:** Found that buttons often use emojis (like 🌐, 📋, 🔊) for visual flair. Screen readers will read these aloud, causing redundant or confusing announcements, especially when the button already has visible text next to it.
**Action:** Always wrap decorative visual characters or emojis in buttons with `<span aria-hidden="true">` to hide them from screen readers while preserving the visual UI.
