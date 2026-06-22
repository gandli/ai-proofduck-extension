## 2025-06-22 - Replace insecure Math.random() usage for GUID generation
**Vulnerability:** Weak random number generation using `Math.random()` to generate GUIDs/session IDs.
**Learning:** `Math.random()` is not cryptographically secure, and the resulting GUIDs can be predictable. A much better and secure approach is to use `crypto.randomUUID()`.
**Prevention:** Always use `crypto.randomUUID()` or `crypto.getRandomValues()` for generating random IDs or values where security or uniqueness is important.
