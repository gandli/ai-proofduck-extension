## 2024-10-30 - ARIA labels for Icon-Only Buttons
**Learning:** Icon-only buttons in complex sidepanel applications (like App.tsx, ResultPanel.tsx) fail accessibility checks if they lack explicit ARIA labels. Since visual space is limited and tooltips might not suffice for screen readers, ensuring localized `aria-label` attributes is a critical accessibility requirement.
**Action:** Always add `aria-label` alongside `title` attributes on all icon-only buttons, sourcing values from the `i18n` file to ensure localized accessibility support.
