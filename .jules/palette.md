## $(date +%Y-%m-%d) - Added focus states for keyboard accessibility
**Learning:** Interactive elements like buttons need explicit `focus-visible` states to support keyboard navigation. Using Tailwind's `focus-visible:ring-2` combined with `focus-visible:outline-none` and project-specific colors like `ring-brand-orange/50` or `ring-white/50` (for elements on colored backgrounds) creates a clean, accessible focus indicator without relying on default browser outlines.
**Action:** When adding new interactive elements, always ensure they have a visible focus state.
