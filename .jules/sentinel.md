## 2025-06-23 - Predictable UUID generation with Math.random()
**Vulnerability:** The UUID generator in `src/services/SpeechService.ts` (`generateGuid()`) uses `Math.random()`, which is a predictable pseudo-random number generator, instead of a cryptographically secure method.
**Learning:** This is a common pattern when trying to generate UUIDs in older environments, but `crypto.randomUUID()` is natively available and secure.
**Prevention:** Always use `crypto.randomUUID()` for UUIDs or `crypto.getRandomValues()` for other random value generation instead of `Math.random()`.
