## 2026-05-14 - Prevent Layout Thrashing in DOM Walker
**Learning:** Calling `window.getComputedStyle` and `getBoundingClientRect` for every text node during extensive DOM traversal causes severe layout thrashing and redundant synchronous layout recalculations, especially when multiple text nodes share the same parent element.
**Action:** Always cache the results of expensive layout properties using a `Map` keyed by the parent `Element` to prevent redundant calculations and significantly improve traversal performance.
