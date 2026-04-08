
## 2024-04-08 - Parallelize Async Operations
**Learning:** Sequential async operations (e.g., `await` in a `for...of` loop) on multiple engines during capability checks cause performance bottlenecks because each network or computation request adds linear time cost ($O(N)$).
**Action:** When performing independent async checks over a collection, always prioritize mapping over them with `Promise.all` to allow parallel execution, significantly reducing blocking latency to only the longest single operation.
