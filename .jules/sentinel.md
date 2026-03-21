## 2024-03-04 - [DOM Manipulation without innerHTML]
**Vulnerability:** Use of innerHTML for DOM manipulation.
**Learning:** Source code states that assignment to innerHTML is forbidden by CI security checks to prevent XSS. In entrypoints/content.ts at line 178, actionContentEl.innerHTML = ''; is used to clear content which breaks the rule.
**Prevention:** Use el.replaceChildren() or while (el.firstChild) { el.removeChild(el.firstChild); } to safely clear elements.
## 2026-03-21 - [Replace Predictable Math.random() with Secure Random ID Generation]
**Vulnerability:** Predictable random numbers using Math.random().
**Learning:** Math.random() produces statistically predictable values and is not a cryptographically secure random number generator. If predictable IDs are used, an attacker could potentially guess or collide identifiers. Using crypto.randomUUID() generates a v4 UUID utilizing the browser's cryptographically secure pseudo-random number generator, effectively nullifying guessability.
**Prevention:** Prohibit the use of Math.random() for sensitive data or critical identifier generation (like requestIds). Use web standards like crypto.randomUUID() or crypto.getRandomValues().
