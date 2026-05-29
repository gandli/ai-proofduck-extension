## 2025-05-24 - Parallelize Engine Availability Checks
**Learning:** Checking the availability of all AI models sequentially using `for...of` creates a major performance bottleneck, especially as the number of engines grows.
**Action:** Use `Promise.all` to parallelize independent async availability checks across entities like TranslationEngines and LocalModels to speed up application startup and state hydration.
