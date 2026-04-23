## 2025-04-23 - [Parallelizing Engine Availability Checks]
**Learning:** Engine availability checks were executing sequentially in a loop, stalling resolution when checking multiple slow adapters.
**Action:** Always map iteration to promises and use `Promise.all` with a wrapper `try...catch` block to parallelize asynchronous condition checking and prevent `Promise.all` fast-failing.