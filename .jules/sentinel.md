## 2025-06-17 - Insecure random GUID generation
**Vulnerability:** Weak random number generation using `Math.random()` to generate GUIDs/Session IDs.
**Learning:** `Math.random()` is not cryptographically secure and the generated GUIDs can be predictable, creating a risk in contexts requiring uniqueness and unpredictability (e.g., session tokens, request IDs).
**Prevention:** Always use native secure Web APIs like `crypto.randomUUID()` to generate standard v4 UUIDs securely.
