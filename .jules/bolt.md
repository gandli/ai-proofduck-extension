## 2024-04-07 - Sequential Async Loop Bottleneck
**Learning:** Sequential `for...of` loops awaiting async tasks (like `engine.checkAvailability()`) cause N+1 performance bottlenecks. This was identified in `EngineManager.ts`, specifically in `getAvailableEngines` and `getEngineInfos`, causing delays equal to the sum of all individual checks instead of parallelizing them.
**Action:** Replace independent sequential async loops with `Promise.all` over `.map()` to dramatically reduce execution time.
