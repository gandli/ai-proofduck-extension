## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.

## 2024-03-04 - [Math.random Predictability]
**Vulnerability:** Use of predictable `Math.random()` for IDs or keys.
**Learning:** `Math.random()` generates values that are not cryptographically secure, and its outputs can be predicted in some environments, potentially leading to identifier collisions or sequence prediction.
**Prevention:** Use `crypto.randomUUID()` to generate unique and secure request IDs.
