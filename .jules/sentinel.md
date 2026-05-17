## 2024-05-17 - Prevent Sensitive Data Exposure in Extension Logs
**Vulnerability:** User-provided text (selected text and message content) was being logged to the console using substring truncation in background and content scripts. Even truncated text can leak sensitive personal information to the browser console. (CWE-532)
**Learning:** Avoid logging any part of user-provided content. Logging functions should only output operational metadata (like text lengths or action types) to maintain data privacy and adhere to the principle of least privilege.
**Prevention:** Remove substring logging of user inputs and replace it with length or metadata logging. Do not expose sensitive data in public PR details.
