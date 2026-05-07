## 2026-05-07 - DOM Traversal Caching
**Learning:** During extensive DOM traversal in `src/utils/pageContentExtractor.ts`, repeated calls to `window.getComputedStyle` and `getBoundingClientRect` on parent elements caused severe layout thrashing and redundant synchronous layout recalculations.
**Action:** Cache the results of `window.getComputedStyle` and `getBoundingClientRect` using a `Map` keyed by the parent `Element` to prevent layout thrashing and improve performance.
