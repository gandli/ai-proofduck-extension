# Refactor Research Summary

**Date:** 2026-03-23

## Key Findings

**Stack:** The current WXT + React + TypeScript stack is already sufficient for a safe in-place refactor. The problem is not tooling; it is unclear boundaries between contexts, storage, UI orchestration, and runtime execution.

**Table Stakes:** The refactor must preserve all five writing modes, page-content fetching, in-page quick translation, engine selection, settings persistence, and local-first privacy behavior.

**Watch Out For:** The biggest risk is silently breaking hidden contracts between sidepanel, background, offscreen, content script, and browser storage.

## Recommended Direction

1. Freeze and document existing contracts first.
2. Decompose the sidepanel into clearer ownership boundaries.
3. Unify engine execution paths behind shared runtime adapters.
4. Split content/background orchestration into thinner entrypoints.
5. Use docs and regression tests to prove the refactor did not change product behavior.

## Scope Guidance

- **Do now:** clarity, contracts, decomposition, tests, docs alignment
- **Do later:** feature expansion, redesign, platform expansion

## Confidence

- High confidence that a staged 4-phase refactor is the lowest-risk path.
