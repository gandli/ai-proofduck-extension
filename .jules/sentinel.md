## 2024-05-03 - [Data Privacy] Stop Logging User Selected Text

**Vulnerability:** The application logs user-selected text and message content in `entrypoints/background.ts` and `entrypoints/content.ts` (e.g. `console.log('[ProofDuck] 菜单点击:', menuId, selectionText.substring(0, 50));` and `console.log('[ProofDuck] 收到消息:', message.type, message.text?.substring(0, 50));`).
**Learning:** Even though the text is truncated to 50 characters, it still exposes user's sensitive/private data to the browser console logs, which violates the data privacy principles and the memory rule "To prevent sensitive data exposure (CWE-532), avoid logging user-provided text—such as selected text or message content—in background or content scripts."
**Prevention:** Remove all logging of user-provided content (like `selectionText`, `message.text`, `selectedText`). Only log operational metadata like event types or content length to maintain data privacy.
