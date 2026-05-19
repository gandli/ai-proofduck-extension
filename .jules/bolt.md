## 2024-05-19 - Avoid DOM layout thrashing in TreeWalker loops
**Learning:** Calling `window.getComputedStyle` on every text node inside a `TreeWalker` loop can cause severe synchronous style recalculation bottlenecks (layout thrashing), as many text nodes share the same parent element.
**Action:** Use a `WeakMap<Element, boolean>` to cache visibility or computed style results per parent element during DOM iteration, avoiding O(N) style computations where N is the number of text nodes.
