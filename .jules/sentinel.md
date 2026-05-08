## 2026-05-08 - Prevent Sensitive Data Exposure in Logs
**Vulnerability:** User selected text and messages were being logged directly to the browser console using `substring(0, 50)` in `entrypoints/background.ts` and `entrypoints/content.ts`.
**Learning:** Even truncated logging can leak private information (CWE-532) to browser console/logs.
**Prevention:** Instead of logging content, log only operational metadata like event types or content length to maintain data privacy.
