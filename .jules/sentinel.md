## 2025-05-22 - Fix Weak Randomness for GUID Generation
**Vulnerability:** The application used `Math.random()` to generate GUIDs/UUIDs for WebSocket communication in `SpeechService.ts`, which is not cryptographically secure and could be predictable.
**Learning:** The fallback logic for randomness was not implemented to use `crypto.randomUUID()` or `crypto.getRandomValues()`, which are much more secure and widely supported.
**Prevention:** Always prefer the Web Crypto API (`crypto.randomUUID()` or `crypto.getRandomValues()`) over `Math.random()` for anything that requires security or uniqueness (like request IDs and UUIDs).
