## 2024-10-24 - Parallelizing sequential engine checks

**Learning:** This codebase manages multiple translation engines through `EngineManager.ts`. Before optimization, the manager used `for...of` loops with `await` to check the availability of each engine sequentially (`engine.checkAvailability()`). This created a significant bottleneck because the total wait time was the sum of all individual engine check latencies.

**Action:** Whenever an orchestrator needs to query the availability or status of multiple independent services, use `Promise.all` over mapped promises to execute these checks concurrently. This reduces the total time to the latency of the slowest service, which can be an exponential speedup depending on the number of services.
