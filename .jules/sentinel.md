## 2025-05-14 - Fix insecure random number generation in TTS Service
**Vulnerability:** Weak random number generation using `Math.random()` in `generateGuid` function for Edge TTS WebSocket connections.
**Learning:** Shared services like `SpeechService` may run in content scripts injected into non-secure HTTP pages. When generating GUIDs or other tokens that should ideally be unique and secure, `Math.random()` poses a predictability risk.
**Prevention:** Always use `crypto.randomUUID()` when available. Implement layered fallbacks using `crypto.getRandomValues()` and finally `Math.random()` to accommodate environments with varying `crypto` API support, such as non-secure HTTP contexts.
