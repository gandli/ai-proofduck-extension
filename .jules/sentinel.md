## 2024-05-15 - [MEDIUM] Prevent sensitive user data leakage in extension logs
**Vulnerability:** User selected text and messages were being logged to the console in background and content scripts.
**Learning:** Even if truncated, logging user input/selected text in extension scripts is a privacy/security risk as it can leak sensitive information to browser console logs.
**Prevention:** Only log operational metadata like event types or content length to maintain data privacy.
