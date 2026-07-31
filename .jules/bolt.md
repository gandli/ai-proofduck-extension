## 2024-05-18 - Component Memoization
**Learning:** Found that `Editor`, `EngineStatus`, and `LanguageBar` are already memoized using `React.memo()`, but `ResultPanel` is not. Since `ResultPanel` takes `output`, `status`, `error`, `isOver`, etc., as props, and these are often updated independently of other components, `ResultPanel` should also be memoized to prevent re-renders when other states in `SidePanelApp` change (like `text` input in `Editor`).
**Action:** Use `React.memo` on `ResultPanel` to optimize rendering.
