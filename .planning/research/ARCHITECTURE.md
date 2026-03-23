# Refactor Research: Architecture

**Date:** 2026-03-23
**Focus:** What target architecture shape would make this extension easier to evolve

## Recommended target shape

### 1. Stable shared contracts
- One source of truth for modes, settings, storage keys, and runtime message payloads
- Explicit distinction between persisted settings, transient UI state, and transport messages

### 2. Thin entrypoints
- `background.ts`, `content.ts`, `offscreen/main.ts`, and `sidepanel/main.tsx` should mostly wire together dedicated modules
- Large imperative flows should move into focused helpers or feature modules

### 3. Sidepanel as composition root
- `App.tsx` should orchestrate sections, not own all logic
- Fetching page content, auto-trigger behavior, and action execution should be independently testable

### 4. Runtime adapters
- Chrome AI path, offscreen local-model path, online API path, and translation fallback should look like interchangeable adapters
- Status and progress events should converge through one shape

### 5. Storage boundary
- Browser storage reads and writes should be centralized so key names and migration rules do not leak everywhere

## Suggested build order

1. Map and freeze current contracts
2. Extract sidepanel state and message boundaries
3. Unify engine routing and worker lifecycle
4. Break up content/background flows
5. Refresh docs and regression coverage

## Why this shape fits the repo

- It respects the extension’s multi-context nature instead of fighting it.
- It lowers regression risk because entrypoints can stay in place while internals are extracted.
- It gives tests clearer targets than today’s large mixed-responsibility files.
