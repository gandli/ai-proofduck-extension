## 2026-05-07 - Added focus visible styles for keyboard navigation
**Learning:** Many custom interactive elements (buttons, switches) lack clear focus indicators for keyboard users, making keyboard navigation difficult. The project's pattern is to combine `focus:outline-none` with `focus-visible:ring-2` and a context-appropriate ring color.
**Action:** Added explicit `focus-visible` ring classes to all non-standard interactive elements to ensure clear keyboard accessibility, matching the background context.
