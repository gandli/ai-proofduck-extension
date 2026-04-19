## 2025-02-18 - Parallelize Engine Availability Checks
**Learning:** Sequential `await` calls in a `for...of` loop during engine availability checks or engine info retrieval cause a significant performance bottleneck as $O(N)$ wait time.
**Action:** Use `Promise.all` alongside `Array.map` to parallelize independent asynchronous operations like `checkAvailability()` across multiple engines, bringing wait time down to $O(1)$ max engine response time.
