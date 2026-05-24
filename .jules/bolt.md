## 2024-05-24 - Layout Thrashing with TreeWalker
**Learning:** When using `TreeWalker` to iterate over text nodes (e.g., for page translation or extraction), multiple text nodes often share the same parent element. Repeatedly calling `window.getComputedStyle(parent)` or `getBoundingClientRect()` on every node causes redundant synchronous style recalculations and layout thrashing.
**Action:** Cache the visibility or computed style and rect results per parent element using a `WeakMap` or `Map` to avoid layout bottlenecks.
