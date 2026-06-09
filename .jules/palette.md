## 2025-06-09 - Added Clear Button to Translation Input
**Learning:** When adding absolutely positioned interactive elements (like a clear button) inside an input or textarea, we need to add sufficient right padding to the input element. Otherwise, the text content will overlap with the button, causing readability and interaction issues.
**Action:** Use `pr-10` or similar padding classes on text inputs that contain absolutely positioned buttons inside them.
