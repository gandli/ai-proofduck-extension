## 2026-05-10 - Prevent Sensitive Data Leakage in Logs (CWE-532)
**Vulnerability:** User-provided text (selected text and message content) was being logged in background and content scripts using `.substring(0, 50)`.
**Learning:** Even truncated logging of user-provided content can leak private information to browser console/logs, violating the principle of least privilege and data privacy (CWE-532).
**Prevention:** Log only operational metadata like event types or content length to maintain data privacy. Never log user-provided text, even if truncated.
