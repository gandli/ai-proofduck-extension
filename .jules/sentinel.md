## 2024-05-23 - [Storage Security: Sensitive Data Persistence]
**Vulnerability:** The application was storing user-selected text (which may contain PII or confidential information) in `browser.storage.local`. This API persists data to disk, leaving it accessible even after the browser session ends and potentially exposing it to other local processes or physical access.
**Learning:** In Web Extensions (MV3), `browser.storage.local` is for persistent settings, while `browser.storage.session` is designed for in-memory, session-scoped data. However, `browser.storage.session` is not directly writable from content scripts in Chrome.
**Prevention:**
1.  Store sensitive, ephemeral user data (like selected text, temporary tokens) ONLY in `browser.storage.session`.
2.  Use a background script mediator to write to `session` storage if the content script cannot access it directly.
3.  Audit all `storage.local.set` calls to ensure no sensitive user input is being persisted.
