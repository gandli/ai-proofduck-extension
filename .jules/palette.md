# Palette's Journal

## 2024-03-XX - Initial Initialization
**Learning:** Initializing palette journal.
**Action:** Ready to record critical learnings.

## 2024-05-20 - Ensure Tooltips and Keyboard Access on Icon-Only Buttons
**Learning:** Icon-only buttons often suffer from poor accessibility because they lack text to explain their purpose. Adding `aria-label` is good for screen readers, but sighted keyboard and mouse users also need clear cues.
**Action:** Always provide a `title` attribute for native mouse hover tooltips, and pair `focus:outline-none` with explicit custom focus ring styles (e.g. `focus-visible:ring-2 focus-visible:ring-brand-orange/50`) to ensure they remain keyboard navigable and convey meaning without text.