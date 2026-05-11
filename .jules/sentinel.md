## 2026-05-11 - [HIGH] Fix sensitive data exposure in logs (CWE-532)
**Vulnerability:** User-provided selected text and message contents were being logged to the browser console, potentially exposing sensitive information.
**Learning:** Even logging truncated user input (e.g., using `substring(0, 50)`) can leak private information to console logs.
**Prevention:** Avoid logging user-provided text entirely. Log only operational metadata like event types or content length to maintain data privacy.
