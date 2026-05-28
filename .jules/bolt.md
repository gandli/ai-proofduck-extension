## 2024-05-28 - Cache Computed Style and DOMRect in TreeWalker
**Learning:** When using `TreeWalker` to iterate over text nodes for page content extraction, avoid repeatedly calling `window.getComputedStyle(parent)` or `getBoundingClientRect()` on every node. Multiple text nodes often share the same parent element, leading to redundant synchronous style recalculations and layout thrashing.
**Action:** Cache the visibility, computed style, or bounding rect results per parent element using a `Map` during node traversal.
