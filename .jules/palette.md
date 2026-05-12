## 2026-05-12 - Screen Reader Repetition in Action Buttons
**Learning:** In React components with visual symbols inside action buttons (e.g., `📋`, `🔊`, `×`), if the button already has visible text (like "复制" for copy) or a title/aria-label, screen readers often read both the visual character and the text aloud. This creates redundant or confusing audio output (e.g., "Clipboard, Copy, button").

**Action:** Wrap decorative characters or emojis inside interactive elements with `<span aria-hidden="true">` to prevent screen readers from announcing them redundantly.
