## 2024-05-24 - [CWE-532: Sensitive Data Exposure in Logs]
**Vulnerability:** User-selected text and translation messages were being logged to the browser console.
**Learning:** Even truncated logging of user-provided text can leak private information to browser logs.
**Prevention:** Log only operational metadata like event types or content length to maintain data privacy and the principle of least privilege.
