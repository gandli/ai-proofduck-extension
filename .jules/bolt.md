## 2024-06-07 - Optimization: Cache window.getComputedStyle and getBoundingClientRect in TreeWalker loop
**Learning:** Calling `window.getComputedStyle` and `getBoundingClientRect` on `parent` inside a `TreeWalker` iterating over text nodes causes massive layout thrashing and redundant calculations, because multiple text nodes often share the same parent element.
**Action:** Use a `WeakMap` or `Map` to cache the visibility, style, and rect calculations per parent `Element` inside the loop to avoid duplicate synchronous style recalculations.
