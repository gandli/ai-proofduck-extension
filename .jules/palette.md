## 2024-06-23 - Focus Management on Input Clearing
**Learning:** When adding micro-interactions like a "Clear text" button inside a textarea, simply clearing the state is insufficient for good accessibility. Keyboard focus is easily lost, forcing screen reader users or keyboard navigators to tab back to the input to continue.
**Action:** Always implement a React `useRef` to programmatically return focus to the input (`ref.current?.focus()`) immediately after a clear action to maintain a seamless keyboard navigation experience.
