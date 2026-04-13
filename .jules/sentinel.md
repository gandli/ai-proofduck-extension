## 2024-05-18 - [Fix weak random number generation for GUIDs]
**Vulnerability:** Using cryptographically insecure Math.random() for GUID generation in SpeechService.ts.
**Learning:** When creating random IDs, we should always prefer crypto.randomUUID() or crypto.getRandomValues(). However, since this service might be injected into non-secure HTTP pages (unlike the secure chrome-extension:// context), crypto can be undefined, and we MUST include a robust fallback.
**Prevention:** Always use the Web Crypto API when available, and strictly test typeof crypto !== "undefined" before use.
