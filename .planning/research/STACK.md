# Refactor Research: Stack

**Date:** 2026-03-23
**Focus:** What stack realities matter for safely refactoring this browser extension

## What the current stack is good at

- WXT already gives the project a clean extension build pipeline and entrypoint model.
- React 19 is a good fit for decomposing the sidepanel into smaller units without changing product behavior.
- TypeScript types are already rich enough to become the backbone for shared message and settings contracts.
- Vitest plus Playwright provide a usable regression net for a staged refactor.

## What the stack implies for refactor strategy

- Keep the extension entrypoint model intact. Refactor around it rather than trying to hide it behind a fake web-app structure.
- Move shared contracts and runtime adapters into explicit modules that each entrypoint can consume.
- Treat browser storage as part of the public runtime contract, not as an internal detail.
- Prefer extraction and composition over framework churn.

## Recommended stack posture for this refactor

### Keep

- WXT as the extension framework
- React + TypeScript for sidepanel UI
- Vitest + Playwright as the verification baseline
- Tailwind-based styling approach

### Strengthen

- Shared contract modules for messages, settings, status, and storage keys
- Sidepanel composition boundaries
- Runtime adapter boundaries for Chrome AI, local models, and network fallbacks
- Testing around cross-context behavior

### Avoid

- Switching frameworks mid-refactor
- Introducing backend dependencies to solve local architecture problems
- Replacing browser storage schema unless proven necessary

## Confidence

- High: Keep current stack, extract shared contracts, and refactor in-place
- Medium: Deep runtime unification between `useWorker.ts` and `worker.ts` will need careful sequencing
- High: No evidence that a framework migration would pay for itself here
