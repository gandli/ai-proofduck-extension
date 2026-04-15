## 2024-04-15 - React Component Layout Thrashing
**Learning:** In React components that render streaming text (like `TranslationResultLayer.tsx`), synchronous DOM size computations (e.g., `window.innerWidth`/`innerHeight`) or complex layout calculations can cause severe layout thrashing and CPU overhead during frequent re-renders (e.g., every ~30ms via `setInterval`).
**Action:** Always wrap these computations in `useMemo` to prevent unnecessary recalculations on every render tick.
