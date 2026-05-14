## 2026-05-14 - Prevent screen reader mispronunciation of visual emojis
**Learning:** Visual emojis (e.g., 🌐, 📋) and characters (e.g., ×) inside buttons or headers that already have text labels or aria-labels can cause screen readers to read redundant or confusing information.
**Action:** Wrap such purely visual elements in a `<span aria-hidden="true">` so screen readers ignore them, while maintaining visual aesthetics and accessible labels.
