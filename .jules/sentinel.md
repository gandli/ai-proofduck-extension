## 2024-11-20 - [Fix] Mitigate Prompt Injection in LLM Workflows
**Vulnerability:** The text processing modes passed unsanitized user input (the highlighted text) into the final language model prompt via direct string interpolation. A malicious block of text could contain structural tags like `[FINAL RESULT]:` or `<TEXT_TO_PROCESS>` that tricks the LLM into discarding the primary instruction and obeying an attacker's injected instruction.
**Learning:** In browser extensions dealing with user-selected text, input must be systematically sanitized of structural markers before formatting the request payload.
**Prevention:** Always use a dedicated sanitization function (`formatUserPrompt`) that explicitly removes or escapes prompt structural tags before interpolating user input.
