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

## 2026-07-07 - Prevent Gemini API Key Leakage via Error Logs
**Vulnerability:** Gemini API key leakage via error messages could bypass regex redaction if a custom/short key does not match predefined SECRET_PATTERNS.
**Learning:** For defense-in-depth, relying solely on generic regex patterns (like AIza or sk-) is insufficient when integrations may allow custom keys. An exact string literal fallback replacement must be implemented on the specific endpoint's error handler before the error is thrown.
**Prevention:** Implement a standard literal replacement fallback (like openai-compat does) for all integrations where the actual configured key is accessible in scope during error handling. Note: Ensure not to retrieve keys directly in content scripts (like Gemini's runtime-loaded pattern) when applying this fallback if doing so breaks existing background interceptors.
## 2026-07-07 - Gemini API Key Caching Closure Bug
**Vulnerability:** The Gemini engine failed to fallback to the 'runtime-loaded' placeholder in content scripts, risking DNR injection failure and causing empty keys.
**Learning:** In browser extension development, when retrieving API keys from local storage in module-level caching closures, ensure that content scripts fallback to a hardcoded placeholder like 'runtime-loaded' rather than leaving the key empty, so that declarativeNetRequest (DNR) rules can safely intercept and inject the real key without exposing it to the content script's memory.
**Prevention:** Always test credential caching layers and carefully review how missing storage APIs are handled in content script contexts.

## 2026-07-07 - Prevent URL Injection in API Engines
**Vulnerability:** The `model` parameter (which might be user-configured depending on the engine, or derived from one) was interpolated directly into the external API URL in `src/engines/gemini.ts` without URL encoding.
**Learning:** Even if a parameter like `model` seems safe (e.g., standard strings like "gemini-1.5-pro"), if it ever becomes user-configurable or is derived from user input, failing to encode it could allow a malicious user to perform URL injection or path traversal (e.g., breaking out of the path with `../` or injecting query parameters with `?`).
**Prevention:** Standardize the use of `encodeURIComponent()` for all dynamic segments inserted into URL paths when making external API requests, especially if the data originates from configuration or user input.
