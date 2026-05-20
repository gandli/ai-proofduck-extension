## 2025-02-20 - Ensure Tooltips Use Role and Focus States

**Learning:** When making icon-only buttons accessible, aria-label alone works for screen readers, but sighted keyboard-only users also need visible tooltips on focus, just like mouse users see on hover with the `title` attribute. Sometimes elements are missing explicit focus outlines depending on the global CSS reset, affecting keyboard usability.
**Action:** Always ensure that interactive elements have a clear `:focus-visible` outline for keyboard navigation, and check if visually presenting a tooltip or extending `title` to cover keyboard focus would enhance the UX.
