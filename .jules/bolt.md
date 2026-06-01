## 2024-05-20 - Sequential Promise Execution in Engine Check
**Learning:** Checking engine and model capabilities sequentially using a `for...of` loop with `await` acts as a bottleneck when scaling the number of models/engines.
**Action:** Use `Promise.all` to fetch statuses and capabilities concurrently when checking all engines (`getAvailableEngines`, `getEngineInfos`) and models (`checkAllModels`).
