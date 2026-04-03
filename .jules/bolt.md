
## 2024-05-24 - [React Render Loop Dependencies in Streaming UIs]
**Learning:** Components that render streaming text (like `TranslationResultLayer.tsx`) using `setInterval` or `requestAnimationFrame` update their state every ~30ms. Unmemoized synchronous DOM size computations (like `window.innerWidth/innerHeight`) inside the component body are unnecessarily evaluated on every single render frame, which causes noticeable layout thrashing or CPU overhead during streams.
**Action:** Always wrap coordinate calculations or derived state involving heavy DOM reads (or layout properties) in `useMemo` when they are inside components that will stream output or animate via rapid React re-renders.
