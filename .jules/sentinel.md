## 2024-11-20 - [Fix] Mitigate Prompt Injection in LLM Workflows
**Vulnerability:** The text processing modes passed unsanitized user input (the highlighted text) into the final language model prompt via direct string interpolation. A malicious block of text could contain structural tags like `[FINAL RESULT]:` or `<TEXT_TO_PROCESS>` that tricks the LLM into discarding the primary instruction and obeying an attacker's injected instruction.
**Learning:** In browser extensions dealing with user-selected text, input must be systematically sanitized of structural markers before formatting the request payload.
**Prevention:** Always use a dedicated sanitization function (`formatUserPrompt`) that explicitly removes or escapes prompt structural tags before interpolating user input.

## 2026-03-02 - [Enhancement] Eliminate innerHTML Usage to Prevent DOM-based XSS
**Vulnerability:** The codebase was clearing element content using `innerHTML = ''`. While benign in a vacuum, using `innerHTML` for content updates is an anti-pattern that often triggers security linters (e.g., Sourcery) and establishes a precedent that can lead to DOM-based XSS when dynamic data is later introduced.
**Learning:** The strict enforcement against `innerHTML` usage applies universally across the codebase, even for clearing contents, to maintain a defense-in-depth posture.
**Prevention:** Use a `while (el.firstChild) { el.removeChild(el.firstChild); }` loop or `el.replaceChildren()` to clear DOM elements instead of assigning to `innerHTML`. Use `DOMParser` for parsing safe SVG strings and `document.createElement` with `textContent` for dynamic text.
