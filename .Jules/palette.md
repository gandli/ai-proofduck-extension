## 2025-05-15 - Missing screen reader announcements for API settings form
**Learning:** Found that the async test results and save success state in `OpenAiCompatSection.tsx` were missing `role="status"` and `aria-live` attributes, causing screen readers to be unaware of the test and save outcomes.
**Action:** Always wrap dynamic test result text and flash messages in a `role="status"` or `aria-live` container to ensure accessibility.
