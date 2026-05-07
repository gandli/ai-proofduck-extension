## 2026-05-07 - Prevent Sensitive Data Exposure in Logs
**Vulnerability:** Logging user-selected text and message contents in background and content scripts (CWE-532). Even with truncation, this risks leaking sensitive user data to the browser console.
**Learning:** Truncation (e.g., `.substring(0, 50)`) is not a sufficient defense for privacy. Logging should only contain operational metadata such as content length.
**Prevention:** Avoid logging `text`, `selectionText`, or full `message` objects. Log lengths or types instead.
