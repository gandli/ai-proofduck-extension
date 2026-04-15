## 2024-05-18 - [Accessibility] Hiding decorative emojis and explicitly typing buttons

**Learning:** When developing browser extensions with floating translation/popup layers, using standard decorative emojis (like 📋, 🔊, ↻) can cause screen readers to redundantly announce the emoji along with the text content (e.g. "clipboard copy", "loudspeaker speaking"). We need to wrap these visually decorative characters in `<span aria-hidden="true">` wrappers to maintain clean screen reader output. Also, these float layers are heavily decoupled from global forms, but explicitly adding `type="button"` prevents unexpected submission behavior if they're later composed inside a form context.

**Action:** Always wrap visual emojis in `<span aria-hidden="true">` inside buttons where the text already describes the action, and default all interactive floating buttons to `type="button"`.
