# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:**
- Vitest 4.x for unit and component tests
- Playwright 1.48.x for extension E2E tests

**Assertion Library:**
- Built-in `expect` from Vitest and Playwright
- Testing Library assertions via rendered DOM expectations

**Run Commands:**
```bash
npm run test           # Run unit/component tests
npm run test:e2e       # Run Playwright extension tests
npm run compile        # Type-check without emitting files
bun test               # Bun-compatible alternative for unit tests
```

## Test File Organization

**Location:**
- `entrypoints/sidepanel/__tests__/` for most unit and component coverage
- `tests/unit/` for focused non-React unit tests
- `tests/e2e/` for extension-level flows

**Naming:**
- `*.test.ts` or `*.test.tsx` for unit tests
- `*.spec.ts` for Playwright E2E tests

**Structure:**
```text
entrypoints/sidepanel/
  __tests__/
    App.test.tsx
    useWorker.test.ts
    worker.test.ts
tests/
  unit/
    svg-parse.test.ts
  e2e/
    navigation.spec.ts
    responsive.spec.ts
```

## Test Structure

**Suite Organization:**
- `describe` blocks grouped by component, hook, or utility
- `it` blocks focus on observable behavior, not implementation details
- Shared setup comes from `entrypoints/sidepanel/__tests__/setup.ts`

**Patterns:**
- Happy DOM is the default unit-test environment
- Browser APIs are mocked where needed
- Side effects such as storage and runtime messaging are commonly stubbed

## Mocking

**Framework:**
- Vitest `vi` mocks and spies

**Patterns:**
- Mock browser extension APIs for `storage`, `runtime`, `tabs`, and `tts`
- Mock fetch-dependent behavior when testing runtime fallbacks
- Keep prompt formatting and type contracts under direct test rather than mocking them away

**What to Mock:**
- Browser APIs
- Network calls
- Long-running model initialization paths

**What NOT to Mock:**
- Pure formatting helpers
- Shared type-driven branching when it can be asserted directly

## Coverage

**Requirements:**
- No explicit numeric coverage gate is visible in config
- Existing suite already emphasizes regression coverage for main UI and worker behaviors

**Configuration:**
- Unit tests exclude `tests/e2e/**`
- E2E uses screenshot-on-failure and retry-on-CI defaults

## Test Types

**Unit Tests:**
- Sidepanel hooks, components, prompt helpers, worker utilities, and message contracts

**Integration-ish UI Tests:**
- App render and behavior tests under `entrypoints/sidepanel/__tests__/`

**E2E Tests:**
- Language switching
- Navigation
- Model loading
- Privacy messaging
- Responsive behavior

## Common Patterns

**Async Testing:**
- Use `async/await` for browser messaging and worker updates
- Assert streamed updates through incremental state changes when relevant

**Error Testing:**
- Verify user-facing fallback messages
- Verify loading/error status transitions

**Snapshot Testing:**
- Not observed in the current repo

---
*Testing analysis: 2026-03-23*
*Update when test runners, setup, or critical regression paths change*
