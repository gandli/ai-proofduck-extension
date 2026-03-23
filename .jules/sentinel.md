## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.

## 2024-03-04 - [Insecure Randomness for Request IDs]
**Vulnerability:** Use of `Math.random()` for generating request identifiers.
**Learning:** Found `Math.random().toString(36).slice(2, 8)` being used to generate unique request IDs in `useWorker.ts`. `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG) and produces predictable values, which could potentially lead to ID collisions or predictability if used in security-sensitive contexts.
**Prevention:** Use `crypto.randomUUID()` or `crypto.getRandomValues()` to generate secure random identifiers instead.
