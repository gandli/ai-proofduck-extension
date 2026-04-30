## 2026-04-30 - Prevent Sensitive Data Exposure in Logs (CWE-532)
**Vulnerability:** User-selected text and message contents were being logged (even if truncated) in `entrypoints/background.ts` and `entrypoints/content.ts`.
**Learning:** Even truncated user inputs logged to the browser console can expose sensitive private data. In extensions, user selections could contain passwords, PII, or confidential documents.
**Prevention:** Never log user text or input data. Log only operational metadata, such as the length of the text or the event type, to maintain functionality metrics while preserving privacy.
