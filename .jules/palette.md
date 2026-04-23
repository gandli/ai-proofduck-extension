## 2024-03-XX - Missing Focus States on Icon Buttons
**Learning:** Custom UI elements (like icon-only buttons or switches) often omit keyboard focus indicators compared to native text buttons.
**Action:** Always add `focus:outline-none focus-visible:ring-2` with appropriate colors (`ring-white` for dark backgrounds, `ring-brand-orange/50` for light) to ensure keyboard accessibility.