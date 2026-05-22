## 2024-05-22 - Parallelize Engine and Model Availability Checks
**Learning:** Sequential async iterations on translation engines and AI models (via `for...of`) create significant performance bottlenecks in this codebase.
**Action:** Always use `Promise.all` combined with `.map` to parallelize independent async availability checks when iterating over registered entities like models and engines.
