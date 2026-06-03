## 2024-06-03 - Optimizing TreeWalker Style Calculation
**Learning:** Calling window.getComputedStyle(parent) inside a TreeWalker iterating over text nodes causes massive synchronous layout thrashing/style recalculations because multiple text nodes often share the same parent element.
**Action:** Always cache the visibility, computed style, or bounding rect results per parent element using a Map or WeakMap when iterating over text nodes.
