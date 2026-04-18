
## 2024-05-18 - EngineManager Parallel Availability Checks
**Learning:** In the `EngineManager`, the process of checking multiple translation engines for their availability can cause severe startup and selection latency if executed sequentially within a standard `for...of` loop, as each engine performs its own independent network or initialization checks. This architecture inherently supports parallelization.
**Action:** Always parallelize independent asynchronous state checks across collections (e.g., `engines.map(...)` then `Promise.all()`) instead of using sequential `await` calls in loops. This effectively reduces the total delay from $O(N)$ to $O(1)$ concerning the number of engines.
