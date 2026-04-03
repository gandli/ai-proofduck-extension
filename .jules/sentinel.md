## 2026-04-03 - [Insecure Math.random Usage for GUIDs]
**Vulnerability:** A custom implementation of GUID generation in `SpeechService.ts` was using `Math.random()`. This is not cryptographically secure, and the values are predictable.
**Learning:** Shared service files like `SpeechService` can be injected via content scripts into HTTP pages where `crypto.randomUUID()` is undefined. Relying strictly on `crypto.randomUUID()` breaks functionality on these sites.
**Prevention:** Always implement a fallback for `crypto.randomUUID()` utilizing `crypto.getRandomValues()` to support environments lacking secure context APIs when making random generation secure in browser extensions.
