## 2026-07-07 - Gemini API Key Leakage Vulnerability Fix
**Vulnerability:** Google AI Studio `AIza` keys were not included in `SECRET_PATTERNS`, risking plain-text leakage in error logs or the UI.
**Learning:** When adding new LLM engine integrations (like Gemini), their specific secret token patterns must be proactively added to the centralized sanitization functions to maintain defense in depth.
**Prevention:** Add a security checklist item when reviewing PRs for new engine integrations to verify their token patterns are covered by `sanitizeSecrets`.

## 2026-07-07 - Prevent API Key Leakage via URL Parameters
**Vulnerability:** Gemini API key was passed in the URL query string (`?key=...`), which risks exposing the secret in network logs, proxies, and error messages.
**Learning:** Even over HTTPS, query parameters are logged in plaintext. Sensitive credentials must always be transmitted via secure HTTP headers.
**Prevention:** Standardize the use of `Authorization` or provider-specific headers (like `x-goog-api-key`) for all external LLM API requests.
## 2026-07-07 - Gemini API Key Caching Closure Bug
**Vulnerability:** The cached `getConfig` closure returned a literal `'runtime-loaded'` for the `apiKey` instead of reading it from storage.
**Learning:** When modifying module-level caching closures (like `getConfig` in API engines) that use a boolean flag (e.g., `configLoaded`) to prevent redundant storage reads, you must ensure the variables holding the cached data are declared in the same outer scope as the flag. Declaring them locally or hardcoding them inside the closure will return uninitialized/hardcoded values on subsequent cache hits.
**Prevention:** Always test credential caching layers and carefully review scope in closure-based caching mechanisms for API credentials.
