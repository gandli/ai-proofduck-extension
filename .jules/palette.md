## 2026-05-13 - Wrap purely visual characters and emojis in buttons with aria-hidden
**Learning:** TranslationResultLayer.tsx uses pure visual elements like "×" and emojis (🌐, 📋, 🔊, ↻, 📖) directly inside buttons and inline text alongside normal text. Screen readers may misinterpret or redundantly announce these visual-only characters.
**Action:** When using purely visual characters or emojis inside buttons or headers that already have text labels or an `aria-label`, wrap the visual element in `<span aria-hidden="true">` to prevent screen readers from incorrectly announcing it.
