## 2025-02-19 - Insecure Random GUID Generation
**Vulnerability:** Found `Math.random()` being used to generate GUIDs in `src/services/SpeechService.ts`.
**Learning:** `Math.random()` is not cryptographically secure and can be predictable, which is risky for generating unique identifiers (Medium Priority).
**Prevention:** Always use standard Web APIs like `crypto.randomUUID()` for generating UUIDs, which uses a CSPRNG and is widely supported in modern environments.
