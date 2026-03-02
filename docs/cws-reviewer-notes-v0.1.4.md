# Chrome Web Store Reviewer Notes (v0.1.4)

Thank you for reviewing **AI proofduck**.

## Core purpose

AI proofduck is a writing-assistant extension for text optimization:
- Summarize
- Correct
- Proofread
- Translate
- Expand

## Engine routing (important)

The extension uses a hybrid route:
1. Chrome Built-in AI (Gemini Nano) when available
2. Local WebGPU/WASM models
3. Online API (OpenAI-compatible)
4. Translate-mode fallback services (to keep translation usable in constrained environments)

## Reproduction steps

### A) Basic text workflow (all modes)
1. Open any webpage with text.
2. Open AI proofduck sidepanel.
3. Paste text in the input area (or select text on page first).
4. Choose one mode and click Execute.

### B) Chrome AI path
1. In settings, choose **Chrome Built-in AI**.
2. Run any mode.
3. If Chrome Built-in AI is unavailable in review environment, follow fallback below.

### C) Fallback path (review-safe)
1. If Chrome AI is unavailable, click **Switch to free API fallback**.
2. Extension auto-switches to Online API preset and opens settings.
3. For translate mode, if no API key is configured, translation fallback can still return results.

## Clarification for availability-dependent features

Some features depend on runtime availability:
- Chrome Built-in AI support and model availability
- Local model readiness (WebGPU/WASM loading)
- Online API key availability

To reduce review friction, translation mode includes fallback behavior.

## Permissions justification (summary)

- `sidePanel`: writing assistant UI
- `storage`: local settings/key storage
- `activeTab` + `contextMenus`: user-triggered text processing with least privilege
- `tts`: optional read-aloud for generated results

## Security statement

No remote hosted executable code is loaded at runtime.
All extension logic is bundled in package assets.
