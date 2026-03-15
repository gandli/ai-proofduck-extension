## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.

## 2026-03-15 - [Replace Predictable Identifier Generation]
**Vulnerability:** Predictable request identifier generation using `Math.random()`.
**Learning:** Generating identifiers like request IDs with `Math.random()` provides insufficient entropy and predictable values, increasing the risk of ID collision or prediction attacks.
**Prevention:** Always use cryptographically secure random identifier generation, such as `crypto.randomUUID()` or `crypto.getRandomValues()`, for identifiers that need to be unique and secure.
