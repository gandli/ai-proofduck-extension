## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.
## 2026-03-08 - [Insecure Fallback to Local Storage on Session Failure]
**Vulnerability:** A fallback mechanism in the settings update hook saved the entire updated settings object, including the plaintext `apiKey`, to `browser.storage.local` when `browser.storage.session.set` threw an error (e.g., due to quota limits).
**Learning:** Error handling mechanisms (like `.catch`) must adhere to the principle of failing securely. Graceful degradation should not involve relaxing security constraints. Persisting sensitive credentials to disk rather than session memory unnecessarily broadens the attack surface.
**Prevention:** Remove silent fallbacks that persist secrets. Log the failure and accept the loss of the session state instead of attempting an insecure recovery.
