## 2024-05-18 - Math.random() used for GUID generation
**Vulnerability:** `Math.random()` was used to generate GUIDs/Session IDs in `src/services/SpeechService.ts`.
**Learning:** `Math.random()` is not cryptographically secure and predictable, which could be an issue if GUIDs are used for secure operations.
**Prevention:** Use `crypto.randomUUID()` when available, or a fallback to `crypto.getRandomValues()` to generate secure random numbers instead of `Math.random()`.
