## 2026-07-07 - Gemini API Key Leakage Vulnerability Fix
**Vulnerability:** Google AI Studio `AIza` keys were not included in `SECRET_PATTERNS`, risking plain-text leakage in error logs or the UI.
**Learning:** When adding new LLM engine integrations (like Gemini), their specific secret token patterns must be proactively added to the centralized sanitization functions to maintain defense in depth.
**Prevention:** Add a security checklist item when reviewing PRs for new engine integrations to verify their token patterns are covered by `sanitizeSecrets`.

## 2026-07-07 - Prevent API Key Leakage via URL Parameters
**Vulnerability:** Gemini API key was passed in the URL query string (`?key=...`), which risks exposing the secret in network logs, proxies, and error messages.
**Learning:** Even over HTTPS, query parameters are logged in plaintext. Sensitive credentials must always be transmitted via secure HTTP headers.
**Prevention:** Standardize the use of `Authorization` or provider-specific headers (like `x-goog-api-key`) for all external LLM API requests.
