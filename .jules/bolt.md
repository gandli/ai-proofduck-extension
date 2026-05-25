## 2024-05-25 - Parallelize async checks for models and engines
**Learning:** The codebase's core logic centers around managing AI translation engines and local AI models. Operations that iterate over these entities (like checking availability across all registered engines/models) must be parallelized with Promise.all to prevent sequential async bottlenecks.
**Action:** Use Promise.all when fetching info or checking availability for multiple independent models or engines to speed up the process.
