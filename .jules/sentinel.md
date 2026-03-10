## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.

## 2024-03-05 - [Insecure Randomness for Identifiers]
**Vulnerability:** Use of `Math.random()` to generate IDs.
**Learning:** `Math.random()` generates predictable values which could theoretically be guessed, leading to insecure ID generation (e.g., tracking or state manipulation if IDs are used to route responses).
**Prevention:** Use cryptographically secure methods like `crypto.randomUUID()` or `crypto.getRandomValues()` for identifier generation.
