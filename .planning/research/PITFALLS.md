# Refactor Research: Pitfalls

**Date:** 2026-03-23
**Focus:** What is most likely to go wrong during this refactor

## Pitfall 1: Breaking hidden cross-context contracts

- Warning signs: selected text stops syncing, quick translate hangs, sidepanel no longer recovers state
- Prevention: inventory storage keys and runtime message shapes before extraction; add regression checks around them
- Phase: Phase 1 and Phase 3

## Pitfall 2: Duplicating engine-routing decisions in new places

- Warning signs: one path uses Chrome AI directly while another still bypasses shared rules
- Prevention: define one execution-routing layer and migrate callers onto it incrementally
- Phase: Phase 3

## Pitfall 3: Treating App.tsx cleanup as purely visual

- Warning signs: component tree looks cleaner but hooks still hide sprawling side effects
- Prevention: split by responsibility, not only by JSX
- Phase: Phase 2

## Pitfall 4: Leaving content-script behavior as an untestable monolith

- Warning signs: `content.ts` keeps growing and only E2E tests can catch regressions
- Prevention: extract popup state transitions and action mapping into focused helpers
- Phase: Phase 4

## Pitfall 5: Updating docs without proving behavior

- Warning signs: planning docs say the system is cleaner, but compile/tests/manual checks were not rerun
- Prevention: make verification part of each phase definition
- Phase: All phases

## Pitfall 6: Accidental storage regression

- Warning signs: API key persistence changes, settings reset unexpectedly, ready/failed config tracking disappears
- Prevention: centralize persistence logic and preserve current semantics unless a migration is explicitly designed
- Phase: Phase 1 and Phase 2
