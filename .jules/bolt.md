## 2025-04-02 - Regex and string processing performance patterns
**Learning:** In modern JS engines, attempting to optimize sequential `.replace()` string sanitization into a single-pass `do...while` loop or complex alternation regex is often a rejected anti-pattern that can hurt worst-case performance and introduce logic flaws. Similarly, string concatenation `+=` is highly optimized via ConsString ropes and should not be replaced with array buffering.
**Action:** Avoid micro-optimizing text processing functions that handle structural tags unless there is a proven bottleneck. Focus on measurable network or initialization latency instead.

## 2025-04-02 - Sequential fetching overhead
**Learning:** Polling or probing multiple remote assets sequentially (e.g., in `probeWasmUrl` checking WASM variants with `for (const of)`) introduces significant blocking latency, especially when many requests timeout or 404.
**Action:** Use `Promise.any` combined with `AbortController` timeouts for concurrent probing of fallback endpoints. This limits total wait time to the fastest success rather than the sum of all failures.
