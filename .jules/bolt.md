## 2024-06-09 - TreeWalker DOM Access Optimization
**Learning:** When using `TreeWalker` to iterate over text nodes (e.g., for page translation or extraction), calling `window.getComputedStyle(parent)` or `getBoundingClientRect()` on every node causes severe layout thrashing and redundant synchronous style recalculations. This happens because multiple text nodes often share the same parent element.
**Action:** Always cache the visibility, computed style, or bounding rect results per parent element using a `Map` or `WeakMap` during `TreeWalker` iterations to avoid redundant DOM access.
