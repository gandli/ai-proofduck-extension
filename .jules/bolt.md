## 2026-05-05 - Prevent Layout Thrashing in DOM Traversal
**Learning:** Extensive DOM traversal with repeated calls to `window.getComputedStyle` and `getBoundingClientRect()` on the same parent elements causes severe layout thrashing and synchronous recalculations, acting as a major performance bottleneck.
**Action:** Cache the results of these calls using a `Map` keyed by the parent `Element` (e.g., `visibilityCache` and `rectCache`) to avoid redundant synchronous layout recalculations and improve extraction speed.
