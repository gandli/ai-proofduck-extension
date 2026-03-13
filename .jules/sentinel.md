## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.
## 2024-03-04 - [Replace Predictable Math.random() in Identifier Generation]
**Vulnerability:** Weak random number generation using `Math.random()` for creating identifiers (like `requestId`).
**Learning:** `Math.random()` produces predictable values which could be exploited in specific attack scenarios (e.g. ID collision attacks). For identifiers representing distinct tracking units, cryptographic randomness provides a necessary layer of security, especially in an extension passing messages.
**Prevention:** Avoid using `Math.random()` to generate identifiers. Instead, use cryptographically secure methods natively available in the environment, such as `crypto.randomUUID()`.
