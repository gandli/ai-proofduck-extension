## 2024-06-18 - Clear Input Pattern

**Learning:** When adding absolute positioned interactive elements (like a clear button) inside an input/textarea, it's crucial to return focus to the original input after interaction to maintain keyboard accessibility flow. This prevents keyboard users from losing their context when clearing the field.

**Action:** Always use a React `useRef` to `focus()` the target input element inside the clear handler function, and add sufficient padding (`pr-10`) to the input to prevent text from overlapping the absolute-positioned button.
