## 2024-06-16 - Do not use Math.random() for UUIDs
**Learning:** Math.random() is cryptographically insecure and predictable, and should not be used to generate UUIDs, GUIDs, or session IDs.
**Action:** Use native secure Web APIs like crypto.randomUUID() instead.
