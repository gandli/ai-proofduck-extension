## 2024-05-30 - Parallelize Async Iterations
**Learning:** Checking model and engine availability inside sequential `for...of` loops blocks execution on every async check, drastically increasing setup time.
**Action:** Use `Promise.all()` with `Array.prototype.map()` when iterating over independent async checks to execute them concurrently.
