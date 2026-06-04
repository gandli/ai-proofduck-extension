## 2024-06-04 - Caching DOM properties during TreeWalker traversal
**Learning:** When using TreeWalker to iterate over text nodes (e.g., for page translation or extraction), calling `window.getComputedStyle(parent)` or `getBoundingClientRect()` on every node causes redundant synchronous style recalculations and layout thrashing. Multiple text nodes often share the same parent element.
**Action:** Cache the visibility, computed style, or bounding rect results per parent element using a `Map` or `WeakMap` during the traversal to avoid expensive DOM operations.
