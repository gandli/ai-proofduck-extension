## 2024-05-15 - DOM Text Serialization in High-Frequency Events
**Learning:** Calling `selection.toString().trim()` inside a `selectionchange` event listener causes main-thread jank due to synchronous, expensive DOM text serialization on every selection tick.
**Action:** Always defer expensive operations like DOM text serialization to debounced handlers, using simple boolean checks like `!selection.isCollapsed` in the synchronous event listener.
