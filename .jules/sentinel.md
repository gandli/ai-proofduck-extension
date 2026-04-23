## 2024-04-23 - [Medium] Weak UUID Generation
**Vulnerability:** `Math.random()` was used for UUID generation in a shared service (`SpeechService`). `Math.random()` is not cryptographically secure, leading to predictable UUIDs.
**Learning:** Shared services like `SpeechService` may run in non-secure HTTP contexts (content scripts) where `crypto.randomUUID()` is not available.
**Prevention:** Implement a fallback chain: `crypto.randomUUID()` -> `crypto.getRandomValues()` -> `Math.random()`. Also remember to use nullish coalescing `((array[x] ?? 0) & ...)` when accessing typed arrays to prevent TS `noUncheckedIndexedAccess` errors.
