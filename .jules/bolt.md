## 2024-05-23 - Optimize extractTextNodes by caching computed styles
**Learning:** The extractTextNodes function uses document.createTreeWalker over text nodes and calls window.getComputedStyle on parent elements. This triggers redundant synchronous style recalculations for multiple text nodes sharing the same parent, causing major performance hits.
**Action:** Use a WeakMap within the walker's closure to cache the visibility (getComputedStyle) results per parent element, drastically reducing layout thrashing without sacrificing readability.
