1. **Identify the UX Improvement**:
   In `src/components/popup/TranslationTab.tsx`, the `textarea` allows users to input text to be translated, proofread, polished, or expanded. However, there is no easy way to clear the text if the user wants to start over. This requires the user to manually select and delete the text. I will add a "Clear text" button inside the textarea to allow users to quickly clear the input.

2. **Localization**:
   I have already added the `clearText` translation key to all the locale files in `public/_locales/*`.

3. **Modify `TranslationTab.tsx`**:
   - Add a `useRef` for the textarea so that after clearing the text, focus is returned to the input for immediate keyboard usability.
   - Add a "clear" button that is visible when `inputText.length > 0`.
   - The clear button will have an appropriate `aria-label` using `t('clearText')` and visually use an SVG clear icon.
   - The button will be positioned absolutely in the bottom-right or top-right corner of the textarea wrapper.

4. **Verify the change**:
   - Ensure `bun run lint` passes.
   - Ensure the UI looks correct by manually testing or relying on standard Tailwind CSS classes.

5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**

6. **Submit PR**:
   - PR Title: `🎨 Palette: [UX improvement] Add clear text button to TranslationTab`
   - Description formatted correctly.
