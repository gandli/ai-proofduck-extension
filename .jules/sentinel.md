## 2026-05-02 - Secure GUID Generation Fallbacks
**Vulnerability:** Weak random number generation using Math.random() for GUIDs.
**Learning:** In browser extension contexts, scripts might run in non-secure HTTP pages where crypto.randomUUID() is undefined. Fallbacks must check for its existence before usage.
**Prevention:** Use crypto.randomUUID() when available, then fallback to crypto.getRandomValues(), and finally Math.random() to ensure security and prevent ReferenceErrors.
