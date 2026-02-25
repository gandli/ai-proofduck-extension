## 2025-02-12 - [Missing ARIA Labels on Icon Buttons]
**Learning:** Icon-only buttons consistently lacked ARIA labels across multiple components, hindering screen reader usability. The i18n structure enforced strict key consistency across languages, requiring careful updates.
**Action:** When adding icon buttons, always include 'aria-label' using localized strings or safe fallbacks. Ensure new i18n keys are added to ALL language objects to prevent test regressions.
