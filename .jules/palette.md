## 2024-07-24 - Form Dynamic States Accessibility
**Learning:** This app frequently uses dynamic inline text for form feedback (e.g., "已保存 ✓", "测试中...", connection results) and toggles without ARIA attributes. Without explicit `role="status"`, `role="alert"`, or `aria-live` regions, screen reader users miss crucial async state changes.
**Action:** Apply `role="status"`/`role="alert"` directly to async feedback messages, use `aria-pressed` for icon-only toggle buttons, and use `aria-busy` on async action buttons to convey state changes accurately to assistive tech.
