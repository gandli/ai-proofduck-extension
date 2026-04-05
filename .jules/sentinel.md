## 2024-04-05 - Fix weak GUID generation in SpeechService
**Vulnerability:** The `SpeechService` generated GUIDs using `Math.random()`, which is not cryptographically secure and could lead to predictable IDs, session hijacking, or collision tracking when communicating with Edge TTS WebSocket servers.
**Learning:** `Math.random()` shouldn't be used for generating sensitive request IDs or GUIDs. Even in non-critical scenarios, `crypto.randomUUID()` provides much stronger uniqueness guarantees without performance drawbacks.
**Prevention:** Always default to using the Web Crypto API (`crypto.randomUUID()` or `crypto.getRandomValues()`) for identifiers. Use `Math.random()` strictly as a fallback in ancient/constrained environments where Web Crypto is entirely missing.
