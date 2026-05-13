## 2026-05-13 - Cache DOM Layout Calculations in TreeWalker Traversal
**Learning:** In extensive DOM traversals using `TreeWalker` (like in `extractTextNodes`), repeatedly calling `window.getComputedStyle` and `getBoundingClientRect` for multiple text nodes that share the same parent element causes severe layout thrashing and redundant synchronous layout recalculations.
**Action:** When traversing text nodes or children, cache the results of expensive layout operations (like styles and bounding rects) using a `Map` keyed by the parent `Element` to significantly improve performance.
