## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use document.createElement and textContent, or text nodes instead of innerHTML.

## 2024-03-05 - [Prevent Secret Leakage to Disk]
**Vulnerability:** Fallback to storing `apiKey` in `browser.storage.local` when `browser.storage.session` fails.
**Learning:** `browser.storage.local` is persistent and unencrypted, exposing secrets on disk. The fallback undermined the initial security measure of isolating the secret in session storage.
**Prevention:** Never fallback to persistent local storage for sensitive tokens or API keys if the preferred secure storage mechanism fails. Fail securely by denying the operation or logging the error.
