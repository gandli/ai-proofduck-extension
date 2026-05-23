## 2024-05-23 - Insecure Randomness in GUID Generation
**Vulnerability:** Weak GUID generation using Math.random() found in SpeechService.ts for generating Edge TTS Request IDs.
**Learning:** In browser extension environments, Web Crypto API might be unavailable in certain contexts (like non-secure HTTP content scripts). Simple Math.random() is cryptographically insecure and prone to collisions.
**Prevention:** Implement a layered fallback approach for UUID generation: prefer `crypto.randomUUID()`, fallback to `crypto.getRandomValues()`, and only use `Math.random()` as a last resort to ensure maximum cryptographic security without throwing ReferenceErrors.
