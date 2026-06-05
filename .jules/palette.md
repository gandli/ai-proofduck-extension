## 2026-04-03 - Added Keyboard Focus States to Popup Components
**Learning:** For interactive UI elements (buttons, tabs, inputs) styled with Tailwind CSS, simply adding `focus-visible:ring-2` is often insufficient for perfect accessibility if the element lacks an initial transparent ring or has overlapping borders. Also, `focus-visible` relies on user intent (e.g., Tab key) rather than general focus (e.g., mouse click), preventing unwanted visual noise for mouse users.
**Action:** When adding accessibility focus states in Tailwind:
1. Always combine `focus-visible:outline-none` with `focus-visible:ring-2` to remove default browser outlines before applying the custom ring.
2. Use colors that match the project's branding but have opacity (e.g., `focus-visible:ring-brand-orange/50` or `focus-visible:ring-white/50` on dark backgrounds).
3. Use `focus-visible:ring-inset` for elements like tabs to prevent the ring from clipping outside the element's bounding box.
4. Use `focus-visible:ring-offset-2` for solid buttons to create a visual gap between the button edge and the focus ring.
