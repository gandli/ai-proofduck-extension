## 2024-05-24 - [Avoid expensive DOM text serialization in high-frequency events]
**Learning:** Calling `selection.toString()` inside synchronous `selectionchange` event listeners causes main-thread jank due to high frequency DOM text serialization.
**Action:** Defer text extraction and serialization to debounced handlers (like `handleSelectionChange`) and only check for existence and collapse state in the immediate listener.
