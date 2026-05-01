## 2026-05-01 - [Parallelize Async Array Mapping]
**Learning:** In EngineManager.ts, independent asynchronous engine operations (e.g., checkAvailability) must be parallelized using Promise.all with Array.map. To prevent Promise.all from fast-failing if one engine throws an error, wrap individual operations in a try...catch block inside the map callback.
**Action:** Always prefer Promise.all for independent async operations. Do not mutate an external array inside the async callbacks to preserve deterministic ordering.
