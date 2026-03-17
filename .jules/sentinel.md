## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.
## 2024-03-04 - [Insecure Randomness for Request IDs]
**Vulnerability:** Usage of `Math.random()` to generate request IDs.
**Learning:** `Math.random()` generates predictable values. Using it to generate IDs like `requestId` in extension messages is a security risk because predictability can lead to spoofing or request collisions.
**Prevention:** Use a cryptographically secure random number generator such as `crypto.randomUUID()` or `crypto.getRandomValues()` instead.
