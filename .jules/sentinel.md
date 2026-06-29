## 2026-06-29 - [Secure GUID Generation]
**Vulnerability:** Weak random number generation using Math.random()
**Learning:** Found Math.random() being used to generate a GUID which could be predictable in a browser context.
**Prevention:** Use crypto.randomUUID() when available, falling back to crypto.getRandomValues() to generate secure GUIDs, and Math.random() only as a last resort fallback, verifying crypto object existence.
