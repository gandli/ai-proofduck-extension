## 2026-05-01 - [Parallelize Async Array Mapping]
**Learning:** In EngineManager.ts, independent asynchronous engine operations (e.g., checkAvailability) must be parallelized using Promise.all with Array.map. To prevent Promise.all from fast-failing if one engine throws an error, wrap individual operations in a try...catch block inside the map callback.
**Action:** Always prefer Promise.all for independent async operations. Do not mutate an external array inside the async callbacks to preserve deterministic ordering.
## 2026-05-01 - [WXT Vite Alias Bug]
**Learning:** In WXT projects using Rolldown (v0.20+), the tsconfig path aliases configured in `wxt.config.ts` might randomly fail during GitHub Actions `wxt build` causing `[UNLOADABLE_DEPENDENCY]` errors.
**Action:** Explicitly set the Vite resolve aliases in `wxt.config.ts` to map `@/` to `/src/` to prevent build failures.
## 2026-05-01 - [WXT Build Artifact Path Bug]
**Learning:** By default, WXT 0.20+ outputs the production build to `.output/chrome-mv3` instead of `.output/chrome-mv3-prod` when running `wxt build`. GitHub Actions CI workflows expecting the `-prod` suffix in the artifact path will fail.
**Action:** Always ensure the upload/download artifact paths in CI workflows match the actual WXT output path (e.g. `.output/chrome-mv3`).
