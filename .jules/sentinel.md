## 2026-05-24 - Fix insecure GUID generation in Edge TTS
**Vulnerability:** Weak random number generation (`Math.random()`) used for generating request IDs for the Edge TTS WebSocket API.
**Learning:** `Math.random()` is not cryptographically secure. While request IDs may not directly leak sensitive info, they should still use secure randomness to prevent potential collision or predictability attacks, especially when making API calls.
**Prevention:** Always prefer `crypto.randomUUID()` or `crypto.getRandomValues()` for generating UUIDs or random identifiers in the browser environment, falling back to `Math.random()` only as a last resort in non-secure contexts.
