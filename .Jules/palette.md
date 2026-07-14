## 2026-07-14 - Add Copy Button to SidePanel Result
**Learning:** Adding a copy button to the translated text ResultPanel greatly improves UX by allowing users to quickly grab the output. The copy button states "已复制" and shows a checkmark briefly when clicked for visual feedback.
**Action:** Implemented a `navigator.clipboard.writeText` based copy button in `ResultPanel.tsx` that replaces the word count in the sidepanel UI with a flex row containing the word count and the copy button. Tested it with a new case in `sidepanel-translate.spec.tsx`.
