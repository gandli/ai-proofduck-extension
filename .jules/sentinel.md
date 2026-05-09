## 2026-05-09 - Prevent Information Exposure Through Logging
**Vulnerability:** User-provided text (selected text and message content) was being logged to the browser console using `.substring(0, 50)`. Even truncated, this leaks private user information.
**Learning:** Truncating text before logging does not prevent data leaks. Any user text sent to the console (especially in background or content scripts) exposes sensitive data (CWE-532).
**Prevention:** Only log operational metadata, such as the length of the content or the event type, to maintain data privacy and adhere to the principle of least privilege.
