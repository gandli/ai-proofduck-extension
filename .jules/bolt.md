## 2025-02-12 - Parallelized Engine Availability Checks
**Learning:** In `EngineManager.ts`, the asynchronous `checkAvailability` operations on translation engines are a potential bottleneck since they are independent but were being executed sequentially.
**Action:** Always map these operations into an array of Promises and execute them using `Promise.all` wrapped in a `try...catch` block to parallelize and prevent fast-failing. This is a vital architectural pattern for this project.
