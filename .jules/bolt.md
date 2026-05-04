
## 2026-05-04 - DOM Traversal Layout Thrashing
**Learning:** Multiple sibling text nodes cause repeated synchronous `getComputedStyle` and `getBoundingClientRect` calls on the same parent element during text extraction, leading to severe layout thrashing.
**Action:** Cache the results of these calls in a `Map` keyed by the parent `Element` to optimize O(N) DOM reads down to O(1) per parent element.
