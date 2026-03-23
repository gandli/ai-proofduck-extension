# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Event-driven browser extension with a sidepanel-first UI and an offscreen worker runtime.

**Key Characteristics:**
- Multiple browser entrypoints cooperate through runtime messages and browser storage.
- React sidepanel UI owns most user interaction, while content script handles in-page affordances.
- AI execution is split across Chrome Built-in AI, offscreen worker-hosted WebLLM, online API, and translation fallback paths.
- State is partly in React and partly in browser storage for cross-context recovery.

## Layers

**Extension orchestration layer:**
- Purpose: Coordinate browser-level events and route messages between contexts.
- Contains: `entrypoints/background.ts`, `entrypoints/offscreen/main.ts`
- Depends on: browser extension APIs, worker entrypoint, storage keys
- Used by: sidepanel, content script, context menu flows

**User interaction layer:**
- Purpose: Render the sidepanel UI and manage end-user actions.
- Contains: `entrypoints/sidepanel/App.tsx`, `components/*`, `hooks/*`, `i18n.ts`
- Depends on: shared types, browser APIs, worker bridge
- Used by: sidepanel entrypoint

**In-page interaction layer:**
- Purpose: Add floating translation affordances and page content extraction in visited pages.
- Contains: `entrypoints/content.ts`, `entrypoints/assets/floatingIcon.ts`, `entrypoints/content-styles.css`
- Depends on: browser messaging, DOM APIs, storage coordination
- Used by: active web pages

**AI runtime layer:**
- Purpose: Prepare prompts, choose execution path, manage model lifecycle, and stream results.
- Contains: `entrypoints/sidepanel/useWorker.ts`, `entrypoints/sidepanel/worker.ts`, `entrypoints/sidepanel/worker-utils.ts`, `entrypoints/sidepanel/prompts.ts`
- Depends on: shared settings/types, `@mlc-ai/web-llm`, browser or fetch APIs
- Used by: sidepanel and offscreen runtime

**Shared contract layer:**
- Purpose: Define stable shapes for modes, settings, progress, and message payloads.
- Contains: `entrypoints/sidepanel/types/index.ts`
- Depends on: TypeScript only
- Used by: sidepanel, worker, background-adjacent logic

## Data Flow

**Sidepanel generation flow:**
1. User enters or fetches text in the sidepanel.
2. `App.tsx` updates local state and sends a `generate` request through `useWorker`.
3. `useWorker` either invokes Chrome Built-in AI directly or sends a runtime message to the background/offscreen path.
4. `background.ts` ensures the offscreen document exists and forwards the command.
5. `offscreen/main.ts` posts work to `worker.ts`.
6. Worker streams progress and text updates back through runtime messages.
7. Sidepanel updates result panels and loading state.

**Quick translate flow:**
1. User selects text on a page and triggers the in-page affordance or context menu.
2. `content.ts` or `background.ts` stores intent and sends runtime messages.
3. `useWorker` or offscreen worker handles translation.
4. Background forwards worker updates back to the active tab.
5. Content script updates the floating translation popup.

**Full-page processing flow:**
1. Sidepanel or context menu asks content script for page text.
2. Content script extracts visible page content.
3. Sidepanel stores the returned text and triggers summarize or translate.

**State Management:**
- UI state lives in React hooks.
- Cross-context recovery lives in `browser.storage.local`.
- API key is intentionally mirrored into `browser.storage.session` instead of long-term local storage.

## Key Abstractions

**Mode contract:**
- Purpose: Keep all five writing actions aligned across UI, prompts, worker, and tests.
- Examples: `ModeKey`, `MODES`, `emptyModeResults()`
- Pattern: Shared enum-like TypeScript definitions

**Settings contract:**
- Purpose: Hold engine choice, language, API details, and persisted runtime state.
- Examples: `Settings`, `DEFAULT_SETTINGS`
- Pattern: Shared persisted configuration object

**Worker bridge messages:**
- Purpose: Carry load, generate, progress, complete, and error events across extension contexts.
- Examples: `WorkerInboundMessage`, `WorkerOutboundMessage`
- Pattern: Discriminated union message protocol

**Engine routing split:**
- Purpose: Separate Chrome AI handling from offscreen worker handling.
- Examples: `runChromeAiGenerate`, `WebLLMWorker.getEngine`
- Pattern: Conditional runtime adapter with duplicated decision points today

## Entry Points

**Background service worker:**
- Location: `entrypoints/background.ts`
- Triggers: Extension startup, context menu clicks, runtime messages
- Responsibilities: Sidepanel opening, offscreen document setup, message forwarding

**Content script:**
- Location: `entrypoints/content.ts`
- Triggers: Matching page loads and user text selection
- Responsibilities: Floating icon, translation popup, page-content extraction

**Sidepanel UI:**
- Location: `entrypoints/sidepanel/main.tsx`
- Triggers: Sidepanel open
- Responsibilities: Mount React app

**Offscreen runtime:**
- Location: `entrypoints/offscreen/main.ts`
- Triggers: Background forwarding engine work
- Responsibilities: Create and manage the worker process

## Error Handling

**Strategy:** Most contexts recover locally, set UI-visible error state, and keep extension interaction alive.

**Patterns:**
- Sidepanel catches browser messaging failures and maps them to translated UI strings.
- Worker emits `error` messages instead of throwing across contexts.
- Content script converts common runtime failures into action prompts for the user.
- Background ignores best-effort forwarding failures to avoid breaking active tabs.

## Cross-Cutting Concerns

**Persistence:**
- Settings, selected text, engine status, and menu intents are stored in browser storage.

**Localization:**
- UI strings are localized in sidepanel i18n files and extension locale messages.

**Privacy path selection:**
- Product behavior prefers on-device execution first, then cloud, then translation-only fallback.

**Testing:**
- Unit tests focus heavily on sidepanel logic and message behavior.
- E2E tests cover extension UI, responsiveness, privacy messaging, and language switching.

---
*Architecture analysis: 2026-03-23*
*Update when entrypoints, message routing, or engine boundaries change*
