## 2026-04-28 - Parallelize engine availability checks
**Learning:** Engine availability checks (`checkAvailability`) are independent asynchronous operations. Running them sequentially in a `for...of` loop creates a bottleneck where total time equals the sum of all individual check times.
**Action:** Use `Promise.all` with `Array.map` to run independent engine checks concurrently. Wrap individual operations in `try...catch` inside the map callback to prevent `Promise.all` from fast-failing if one engine throws an error.
