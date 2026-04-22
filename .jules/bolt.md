## 2024-04-22 - Parallelizing Independent Async Operations
**Learning:** In managers (e.g., `EngineManager.ts`), sequentially awaiting independent asynchronous operations (like `engine.checkAvailability()`) within a `for...of` loop introduces significant, cumulative latency.
**Action:** Always parallelize such independent async operations using `Promise.all` combined with `Array.map` (with internal try/catch to prevent fast-failing) to optimize throughput and reduce bottlenecking.
