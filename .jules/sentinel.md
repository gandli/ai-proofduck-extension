## 2024-05-04 - Weak Randomness in GUID Generation
**Vulnerability:** Weak random number generation using `Math.random()` for GUIDs in `SpeechService.ts`.
**Learning:** Shared services like `SpeechService` may run in non-secure HTTP pages (content scripts), meaning `crypto.randomUUID()` might not be available.
**Prevention:** Always implement a fallback chain: `crypto.randomUUID()` -> `crypto.getRandomValues()` -> `Math.random()`. When using `crypto.getRandomValues` for bitwise operations with typed arrays, wrap nullish coalescing in parentheses like `((array[0] ?? 0) & 15)`.
