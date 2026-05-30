## 2024-05-30 - Focus-Visible Utility Usage in Tailwind

**Learning:** When adding keyboard accessibility focus states to interactive elements (like buttons and tabs) using Tailwind CSS, standardizing on a combination of `focus-visible:outline-none` and a custom project ring color (e.g., `focus-visible:ring-brand-orange/50`) provides a much better and consistent UX than default browser outlines. Using `focus-visible:ring-offset-2` for solid buttons and `focus-visible:ring-inset` for tightly packed elements like tabs prevents visual clipping.

**Action:** Always prefer `focus-visible` over `focus` to ensure focus rings only appear during keyboard navigation, not on mouse clicks, to maintain visual polish while fully supporting a11y.
