## 2025-05-21 - Fix weak random number generation

**Vulnerability:** Weak random number generation using Math.random() in the generateGuid function of SpeechService.ts could lead to predictable IDs, which can be a security vulnerability if the IDs are used for sensitive references.
**Learning:** Math.random() is not cryptographically secure and should not be used for security-critical random generation like UUIDs/GUIDs. The Web Crypto API provides secure alternatives.
**Prevention:** Always use crypto.randomUUID() for UUID generation. If unsupported, fallback to crypto.getRandomValues() and only use Math.random() as a last resort.
