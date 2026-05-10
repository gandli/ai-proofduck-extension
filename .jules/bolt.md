## 2026-05-10 - Parallelize independent asynchronous checks
**Learning:** Sequential `await` in loops (like `for...of`) when checking independent services/engines leads to a bottleneck.
**Action:** Use `Promise.all` with `Array.map` to parallelize independent asynchronous checks. Ensure that errors in individual tasks are caught within the mapped promises so that `Promise.all` doesn't fast-fail and crash the whole batch.
