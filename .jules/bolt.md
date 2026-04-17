## 2026-04-17 - [Parallelize Engine Availability Checks]
**Learning:** Engine availability checks (like `checkAvailability()` for multiple translation engines) are independent async operations. The original architecture used sequential `await` in a `for...of` loop, causing cumulative latency (O(N) waiting time).
**Action:** Always use `Promise.all` combined with array mapping for independent async iterations to execute them concurrently, significantly speeding up iterations (e.g. `getAvailableEngines` and `getEngineInfos`).
