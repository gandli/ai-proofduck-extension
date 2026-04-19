
## 2024-05-24 - Secure GUID Generation
**Vulnerability:** Weak random number generation in `SpeechService.ts` via `Math.random()` to generate GUIDs.
**Learning:** This codebase incorrectly used `Math.random()` which generates predictable values for pseudo-random identifiers like Request IDs. Predictable identifiers might allow tracking or replay attacks depending on usage context.
**Prevention:** Used standard cryptographic random number generation functions instead (`crypto.randomUUID()` where available, failing back to `crypto.getRandomValues()` as dictated by browser extension environment compatibility).
