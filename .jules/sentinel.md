## 2024-06-01 - Plaintext API Key Storage in Extension
**Vulnerability:** API keys were stored in plaintext in Chrome local storage despite a comment `// API Keys (encrypted in storage)`.
**Learning:** Chrome extension `storage.local` is not encrypted by default. Any script or user with access to the extension can read these plaintext API keys. The `chromeStorageAdapter` used for `zustand` persist was storing raw JSON strings.
**Prevention:** Implement lightweight obfuscation/encryption using XOR+Base64 (or `crypto.subtle`) for the `storage.local` state. Make sure backward compatibility is preserved for existing users by checking if the loaded state is a valid plaintext JSON object first.
