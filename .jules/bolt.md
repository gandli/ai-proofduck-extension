## 2024-06-25 - Cache Engine Manager Sorted Array
**Learning:** `Array.from(engines.values()).sort(...)` was being called on every `pickBest()` execution, causing redundant array allocations and sorting overhead on the hot path (frequent text selections in the browser).
**Action:** Used module-level caching `sortedCache` inside `createEngineManager()` and invalidated it during `register()` to avoid this O(N log N) overhead.
