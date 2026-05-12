## 2026-05-12 - [Stop logging user-provided text]
**Vulnerability:** The application was logging user-selected text and message content (even if truncated) in `entrypoints/background.ts` and `entrypoints/content.ts`.
**Learning:** Even truncated logging of user-provided text can leak sensitive, private information into the browser console/logs, violating the principle of least privilege and data privacy (CWE-532).
**Prevention:** Never log user-provided text or sensitive message content. Only log operational metadata like event types or content length.
