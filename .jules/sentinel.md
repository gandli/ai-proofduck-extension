## 2026-05-13 - Insecure Random Number Generation for GUIDs
**Vulnerability:** Weak random number generation using Math.random() in generateGuid inside src/services/SpeechService.ts.
**Learning:** Math.random() is not cryptographically secure. In extension contexts, shared services might run in non-secure HTTP pages where crypto.randomUUID() is not available, so robust fallbacks are necessary.
**Prevention:** Use crypto.randomUUID() when available, with a fallback to crypto.getRandomValues(), and only fall back to Math.random() as a last resort.
