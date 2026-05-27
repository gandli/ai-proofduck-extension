## 2025-05-27 - Cache layout calculations when iterating text nodes
**Learning:** Using `TreeWalker` to iterate over text nodes often leads to redundant synchronous layout calculations (`getComputedStyle` and `getBoundingClientRect`) because multiple text nodes frequently share the same parent element.
**Action:** Always cache visibility or bounding rect results per parent element (e.g., using a `WeakMap`) during DOM text iteration to significantly reduce layout thrashing and improve performance.
