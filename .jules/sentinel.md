## 2025-02-28 - Weak GUID Generation

**Vulnerability:** Weak PRNG (`Math.random()`) used for generating GUIDs in `EdgeTTSProvider` inside `src/services/SpeechService.ts`.
**Learning:** Security-sensitive components, even in seemingly benign utilities like TTS streams, require cryptographically secure randomness to prevent predictability and potential replay/spoofing attacks if IDs are ever logged or exposed.
**Prevention:** Always default to `crypto.randomUUID()` for UUID/GUID generation. When running in contexts where this might fail (e.g., injected content scripts on non-secure HTTP origins), provide a fallback using `crypto.getRandomValues()`. Rely on `Math.random()` strictly as a last resort to maintain functional stability without completely sacrificing standard security practices when better options are unavailable.
