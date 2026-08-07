## 2025-07-15 - Added Copy Button to ResultPanel
**Learning:** Adding a copy button for translation results is a significant UX improvement for quick operations in a sidepanel. While implementing this, it's critical to ensure the `navigator.clipboard` access is guarded with a `typeof navigator !== 'undefined'` check to avoid SSR or test environment crashes. It's also important to provide visual feedback (like a checkmark) and use proper ARIA labels (`aria-label`) that update based on the copy state for accessibility.
**Action:** Always include visual feedback, `aria-label`, `title`, and `focus-visible` styles for icon-only interactive buttons to ensure accessibility and usability. Always guard browser APIs like `navigator` against undefined environments.

## 2025-07-28 - Link error state to textarea
**Learning:** Using `aria-invalid` and `aria-describedby` provides immediate context to screen reader users when a text area enters an error state (like exceeding character limit). Removing `aria-live` from the counter span prevents the screen reader from double-announcing input.
**Action:** Always link visual error states and helper texts to inputs using `aria-invalid` and `aria-describedby`.

## 2025-07-27 - Fixed Focus Loss on Clear Button
**Learning:** When a button disables itself upon being clicked (like a "Clear Text" button that becomes disabled when the input is empty), the keyboard focus is lost and resets to the `body` element. This creates a highly frustrating experience for screen reader and keyboard users who must tab all the way back through the page. Additionally, adding `aria-invalid` to textareas when limits are exceeded improves form accessibility.
**Action:** Always programmatically manage focus (e.g., return focus to the primary input field) when an action disables the currently focused interactive element. Use `aria-invalid` for constraint validation states.
## 2025-05-18 - Improve Gemini API Key Visibility

**Learning:** The Gemini API configuration section in the Options page had a password field for the API Key but no way for the user to toggle visibility. Given that API Keys are long and hard to verify when pasted, providing a toggle (like the one used in `OpenAiCompatSection`) significantly improves the user experience by reducing errors.
**Action:** Implemented a visibility toggle for the API key input in `GeminiSection` to match the UX in `OpenAiCompatSection`, using the `Eye` and `EyeOff` icons from `lucide-react` with proper aria-labels and tooltips.

## 2025-08-01 - Fix dangling aria-controls
**Learning:** When using `aria-controls` on a button, it is critical to ensure the target element actually has the corresponding `id` attribute. A dangling `aria-controls` without a matching `id` breaks screen reader navigation, as the screen reader cannot programmatically link the control to the content it affects.
**Action:** Always verify that the `id` specified in `aria-controls` exists in the DOM.

## 2025-08-07 - Dynamic Status Message Accessibility
**Learning:** Screen readers may fail to announce dynamic status messages if the `aria-live` region itself is conditionally rendered, as the screen reader does not register the region in time.
**Action:** Always wrap conditionally rendered success or error text (e.g., `{isVisible && <span>...</span>}`) inside a permanent, non-conditional container element with `role="status"` and `aria-live="polite"`.
