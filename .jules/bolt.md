## 2024-06-25 - WeakMap Caching in DOM Traversal
**Learning:** In frontend performance, calling `window.getComputedStyle(parent)` and `parent.getBoundingClientRect()` inside a `TreeWalker` callback is highly inefficient because it forces layout/style recalculation repeatedly for multiple text nodes within the same parent element.
**Action:** Use a `WeakMap` to cache the visibility and `DOMRect` of parent elements during DOM traversal. This avoids redundant computations when multiple text nodes share the same parent, significantly reducing CPU time.
