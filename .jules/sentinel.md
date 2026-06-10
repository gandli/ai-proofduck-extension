## 2025-05-14 - Prevent sensitive data leakage in error logs
**Vulnerability:** Raw error objects from external API calls were being logged directly to `console.error` in `src/core/EngineManager.ts`, which could leak sensitive internal application states, stack traces, or environment variables.
**Learning:** Always sanitize error objects before logging them to the console or any monitoring service to prevent unintentional data leakage. Extracting just the `error.message` is a simple and effective way to sanitize these logs while retaining debugging context.
**Prevention:** When catching errors, use `error instanceof Error ? error.message : 'Unknown error'` (or a similar sanitization helper) instead of logging the raw error object.
