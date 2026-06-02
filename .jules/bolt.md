## 2024-06-02 - Parallelize availability checks
**Learning:** Operations that iterate over translation engines and local AI models to check availability shouldn't be sequential.
**Action:** Always parallelize async checks over entities with `Promise.all` to prevent sequential async bottlenecks.
