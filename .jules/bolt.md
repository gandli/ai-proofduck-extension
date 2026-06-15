## 2024-04-03 - Optimize LanguageSelector re-renders
**Learning:** In the TranslationTab component, the LanguageSelector receives stable props (languages and setters) but re-renders on every keystroke when the user types in the textarea because the parent TranslationTab state (inputText) changes.
**Action:** Use React.memo() on pure UI components like LanguageSelector that receive stable props but sit inside forms/tabs where sibling state updates frequently. This prevents unnecessary re-renders during typing.
