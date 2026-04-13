## 2024-04-13 - EngineManager.ts Promise.all Parallelization
**Learning:** Checking the availability of multiple translation engines sequentially via a `for...of` loop creates an $O(N)$ performance bottleneck, directly impacting the latency of engine initialization and fallback checks.
**Action:** When performing independent asynchronous checks (like checking multiple engine availabilities), parallelize them using `Promise.all` with `Array.map` to convert the latency to $O(1)$ (bound by the slowest check) rather than $O(N)$.
