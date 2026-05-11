## 2026-05-11 - DOM Traversal Caching
**Learning:** During extensive DOM traversal, repeated calls to window.getComputedStyle and element.getBoundingClientRect on the same parent element (when it contains multiple text nodes) cause severe layout thrashing and redundant synchronous layout recalculations.
**Action:** Cache the results of these operations using a Map keyed by the Element to improve traversal performance.
