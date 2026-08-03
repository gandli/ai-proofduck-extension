## 2024-05-18 - Component Memoization
**Learning:** Found that `Editor`, `EngineStatus`, and `LanguageBar` are already memoized using `React.memo()`, but `ResultPanel` is not. Since `ResultPanel` takes `output`, `status`, `error`, `isOver`, etc., as props, and these are often updated independently of other components, `ResultPanel` should also be memoized to prevent re-renders when other states in `SidePanelApp` change (like `text` input in `Editor`).
**Action:** Use `React.memo` on `ResultPanel` to optimize rendering.
## 2024-05-18 - EngineManager pickBest Sorting
**Learning:** Found that `EngineManager.pickBest` repeatedly sorts the `engines` Map values on every invocation. Since `pickBest` is called frequently (e.g., when resolving engines or opening selection bubbles), sorting the engines repeatedly adds an O(N log N) overhead that can be optimized by caching the sorted result and invalidating it only when `register` is called.
**Action:** Implement caching of the sorted engines array in `createEngineManager` to reduce overhead and improve responsiveness.
