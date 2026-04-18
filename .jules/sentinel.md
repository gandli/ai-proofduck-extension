## 2025-02-27 - [crypto.randomUUID fallback in extension content scripts]
**Vulnerability:** Weak random number generation using `Math.random()` to generate GUIDs.
**Learning:** Browser extension content scripts can run on non-secure contexts (e.g., HTTP pages) where `crypto.randomUUID()` is not available, resulting in fallback code. If the fallback purely uses `Math.random()`, it introduces weak predictability for unique IDs (like request IDs or element IDs).
**Prevention:** Always provide a robust tiered fallback mechanism: prefer `crypto.randomUUID()`, fallback to `crypto.getRandomValues()` if available, and only rely on `Math.random()` as an absolute last resort in non-secure legacy environments without the Web Crypto API.
