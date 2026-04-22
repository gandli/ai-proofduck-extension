## 2026-04-22 - Secure UUID Generation Fallbacks
**Vulnerability:** Weak PRNG using Math.random() for UUID generation.
**Learning:** Content scripts might run in non-secure HTTP contexts where crypto.randomUUID() is unavailable, requiring a tiered fallback (crypto.getRandomValues -> Math.random).
**Prevention:** Use a secure wrapper around UUID generation that checks availability of crypto APIs.
