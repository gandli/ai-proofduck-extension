## 2024-05-20 - Optimize DOM Traversal by Caching getComputedStyle
**Learning:** When using `TreeWalker` to iterate over text nodes (e.g., for page translation or extraction), avoid repeatedly calling `window.getComputedStyle(parent)` on every node. Multiple text nodes often share the same parent element, leading to redundant synchronous style recalculations and layout thrashing.
**Action:** Always cache the visibility or computed style results per parent element using a `WeakMap` when walking the DOM for text extraction.
