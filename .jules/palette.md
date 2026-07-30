## 2025-07-15 - Added Copy Button to ResultPanel
**Learning:** Adding a copy button for translation results is a significant UX improvement for quick operations in a sidepanel. While implementing this, it's critical to ensure the `navigator.clipboard` access is guarded with a `typeof navigator !== 'undefined'` check to avoid SSR or test environment crashes. It's also important to provide visual feedback (like a checkmark) and use proper ARIA labels (`aria-label`) that update based on the copy state for accessibility.
**Action:** Always include visual feedback, `aria-label`, `title`, and `focus-visible` styles for icon-only interactive buttons to ensure accessibility and usability. Always guard browser APIs like `navigator` against undefined environments.

## 2025-07-28 - Link error state to textarea
**Learning:** Using `aria-invalid` and `aria-describedby` provides immediate context to screen reader users when a text area enters an error state (like exceeding character limit). Removing `aria-live` from the counter span prevents the screen reader from double-announcing input.
**Action:** Always link visual error states and helper texts to inputs using `aria-invalid` and `aria-describedby`.
