## 2025-05-19 - Fix weak random number generation
**Vulnerability:** The \`generateGuid\` method in \`SpeechService.ts\` used \`Math.random()\` to generate GUIDs, which is not cryptographically secure and can lead to predictability of GUIDs.
**Learning:** Weak random number generation can lead to security vulnerabilities where unique identification matters. \`Math.random()\` should not be used for security purposes.
**Prevention:** Use \`crypto.randomUUID()\` or \`crypto.getRandomValues()\` to generate cryptographically secure GUIDs, and only fallback to \`Math.random()\` as a last resort in restricted environments where the Web Crypto API is unavailable.
