## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.

## 2025-02-18 - [Insecure Storage Fallback]
**Vulnerability:** Falling back to insecure local storage when session storage fails for sensitive data (API Key).
**Learning:** `useSettings.ts` originally had a `.catch()` block on `browser.storage.session.set({ apiKey })` that silently wrote the API key to `browser.storage.local` if session storage failed, persisting the secret plaintext to disk.
**Prevention:** Fail securely. Catch the error and log it without exposing the sensitive data or falling back to a less secure storage mechanism.
