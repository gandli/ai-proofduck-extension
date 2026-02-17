## 2025-02-14 - [Storage Persistence Bottleneck]
**Learning:** `App.tsx` persisted settings to `browser.storage` on every keystroke (controlled inputs calling `updateSettings`), which triggers IPC and potential disk I/O.
**Action:** Always debounce storage persistence in controlled components, especially for text inputs like API keys and URLs.
