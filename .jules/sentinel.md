## 2025-06-18 - Fix Insecure GUID Generation
**Vulnerability:** The application was using `Math.random()` to generate GUIDs in `src/services/SpeechService.ts`.
**Learning:** `Math.random()` is cryptographically insecure and predictable, making generated IDs susceptible to collision or guessing attacks.
**Prevention:** Always use native secure Web APIs like `crypto.randomUUID()` for generating UUIDs, GUIDs, or session IDs.
