## 2024-05-26 - Optimize full page translation text extraction
**Learning:** In `extractTextNodes`, `window.getComputedStyle(parent)` and `parent.getBoundingClientRect()` are called for *every* text node. Since many text nodes share the same parent element, this causes redundant style recalculations and layout thrashing (which is extremely expensive in the browser).
**Action:** Use a `WeakMap<Element, boolean>` to cache the visibility status and a `WeakMap<Element, DOMRect>` to cache the bounding client rect of parent elements to avoid redundant synchronous style recalculations and reflows.
