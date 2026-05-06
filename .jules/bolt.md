## 2026-05-06 - Parallelize independent availability checks

**Learning:** The `EngineManager` and `ModelLoader` sequentially executed independent availability checks in `for` loops, delaying initialization times. `Promise.all` with `.map()` significantly accelerates this but `.push()` inside `Promise.all` `.map()` causes non-deterministic ordering due to varying resolution times.

**Action:** Used `Promise.all` combined with returning elements (or `null`) from the `.map` handler and `.filter`ing the final output array. This correctly parallelizes independent async operations, avoids failing fast on single errors (by keeping `try/catch` inside the mapper), and preserves deterministic order without external mutation.
