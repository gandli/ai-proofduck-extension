## 2024-04-16 - Parallelize EngineManager status checks
**Learning:** In `EngineManager.ts`, independent asynchronous engine operations like `checkAvailability` were being called sequentially in `for...of` loops, causing linear initialization/status fetch latency ($O(N)$).
**Action:** Always parallelize independent asynchronous checks across plugin architectures/engines using `Promise.all` with `.map()`. This pattern provides an immense speedup ($~5\times$ speedup for 5 mocked engines) and handles failures identically when properly wrapped in `try...catch` blocks.
