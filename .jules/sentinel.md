## 2024-06-12 - Insecure GUID generation
**Vulnerability:** Weak random number generation using `Math.random()` for GUIDs.
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable IDs, which can cause collisions or allow prediction of subsequent IDs.
**Prevention:** Always use `crypto.randomUUID()` when available, falling back to `crypto.getRandomValues()` if needed, and finally `Math.random()` as a last resort in non-secure contexts.
