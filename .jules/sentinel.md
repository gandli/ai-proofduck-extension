## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.

## 2025-03-07 - [API Key Plaintext Leak in Persistent Storage Fallback]
**Vulnerability:** API keys saved to session storage would fall back to persistent local storage on failure.
**Learning:** `useSettings.ts` originally had a `.catch()` on `browser.storage.session.set` which explicitly fell back to `browser.storage.local.set` for the entire settings object, including the `apiKey`. This undermines the intent of separating sensitive data to volatile storage by allowing local fallback under edge case failures (e.g. extension limits).
**Prevention:** Never fallback sensitive credentials like API keys to persistent local storage on session storage failures. Always handle session storage failures securely (e.g., gracefully degrade, log errors) to avoid plaintext disk exposure.
