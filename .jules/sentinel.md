## 2026-04-09 - Insecure GUID Generation in SpeechService
**Vulnerability:** Weak random number generation using Math.random() for GUIDs in src/services/SpeechService.ts.
**Learning:** The application used Math.random() for GUIDs which is cryptographically insecure and predictable.
**Prevention:** Always use crypto.randomUUID() or crypto.getRandomValues() for random IDs, with a fallback to Math.random() only as a last resort in non-secure contexts.
