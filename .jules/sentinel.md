## 2025-02-27 - [Fix weak random number generation for GUIDs]
**Vulnerability:** Weak random number generation using `Math.random()` to generate GUIDs in `SpeechService.ts`.
**Learning:** `Math.random()` is not cryptographically secure and could allow predictability in generated GUIDs, violating security boundaries for WebSockets.
**Prevention:** Always use `crypto.randomUUID()` when generating UUIDs, and properly fallback to `crypto.getRandomValues()` if native UUID generation is not available.
