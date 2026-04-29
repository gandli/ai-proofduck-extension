## 2026-04-29 - Prevent CWE-532 Sensitive Data Exposure in Logs
**Vulnerability:** User-provided text (selected text, message content) was logged to the browser console, potentially exposing sensitive information.
**Learning:** Even truncated logging (e.g., using a 50-character limit) can leak private information to browser logs.
**Prevention:** Log only operational metadata like event types or content length to maintain data privacy and the principle of least privilege. Do not log user-provided text in background or content scripts.
