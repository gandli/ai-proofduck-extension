## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.

## 2026-03-29 - [Insecure Random Number Generation]
**Vulnerability:** Use of Math.random() for generating request identifiers.
**Learning:** Math.random() does not provide cryptographically secure random numbers, making identifiers potentially predictable. The extension sidepanel operates under the secure chrome-extension:// scheme, making it natively safe to use Web Crypto APIs like crypto.randomUUID() without requiring polyfills.
**Prevention:** Use crypto.randomUUID() or crypto.getRandomValues() instead of Math.random() when generating unique identifiers, request IDs, or any security-sensitive random values.
