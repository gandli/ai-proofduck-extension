
## 2026-05-08 - Parallelize availability checks
**Learning:** Core services like EngineManager and ModelLoader previously checked availability sequentially, which degrades startup/initialization performance as the number of engines/models grows.
**Action:** Refactored sequential for...of async loops into Promise.all with Array.map for parallelized execution while retaining local try...catch blocks to prevent fast-failure issues.
