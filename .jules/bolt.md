## 2025-05-23 - DOM API bottlenecks in TreeWalker
**Learning:** During extensive DOM traversal (like `TreeWalker`), fetching `getComputedStyle` and `getBoundingClientRect` repeatedly for identical parent elements of individual text nodes causes severe layout thrashing and exponential performance degradation.
**Action:** Implement `Map` caching for styles and rects grouped by parent element `Element` references to short-circuit expensive, redundant synchronous DOM layout operations.
