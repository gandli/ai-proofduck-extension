## 2024-06-13 - Concurrent async checks in EngineManager
**Learning:** Engine availability checks (`checkAvailability`) and info generation in `EngineManager` were being awaited sequentially in loops.
**Action:** Use `Promise.all` alongside `.map()` to fetch availability checks or other independent async data concurrently, greatly improving iteration time across the application.
