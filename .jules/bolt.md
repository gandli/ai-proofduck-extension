## 2025-02-19 - Settings Persistence Optimization
**Learning:** React state updates (`setSettings`) are fast and keep the UI responsive, but synchronizing state to browser storage (`browser.storage.local.set`) on every keystroke causes excessive IPC overhead and disk writes, which can bottleneck performance in extension sidepanels.
**Action:** Implemented a debounce (500ms) mechanism using `useRef(setTimeout)` to defer storage updates while applying state updates immediately. Ensure cleanup logic (e.g. `clearTimeout`) is handled correctly across renders.
