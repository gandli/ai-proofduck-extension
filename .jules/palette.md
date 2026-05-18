## 2024-05-18 - Improve Screen Reader Experience in TranslationLayer

**Learning:** When using emoji icons as part of button labels without an explicit `aria-label`, screen readers may announce the raw emoji names or read them confusingly, especially when combined with text like "📋 复制". Using `aria-hidden="true"` on emojis inside buttons improves the clarity of the label. Also, having an `aria-label` for buttons that just have visual elements (like `×`) helps make the intent much clearer to screen readers. We should ensure buttons use appropriate `aria-label`s or wrap emojis in `aria-hidden="true"`.

**Action:** Update buttons in TranslationResultLayer to improve accessibility, like wrapping emojis in `aria-hidden="true"` tags and making sure the close button has a proper `aria-label`.
