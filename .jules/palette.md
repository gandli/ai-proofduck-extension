## 2024-05-14 - Improve accessibility of dynamic status messages
**Learning:** React status messages (like "已保存" or test results) in this component appear dynamically. Screen readers may not announce these changes unless they are wrapped in an element with `role="status"` and `aria-live="polite"`. The dynamic changes need to be communicated explicitly.
**Action:** Wrapped the "savedFlash" feedback and "testState" results in `div` elements with `role="status"` and `aria-live="polite"` to ensure screen readers announce these dynamic state updates in the `OpenAiCompatSection` component.
