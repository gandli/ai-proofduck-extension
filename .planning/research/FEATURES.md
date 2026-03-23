# Refactor Research: Features

**Date:** 2026-03-23
**Focus:** Which capabilities are table stakes to preserve during refactor

## Table Stakes

### Core writing modes
- Translate
- Summarize
- Correct / polish
- Proofread
- Expand

### Input and trigger paths
- Direct sidepanel text input
- Fetch current page content
- Context-menu initiated actions
- In-page quick translation from content script

### Runtime paths
- Chrome Built-in AI when available
- Local WebLLM path
- Online API path
- Translation fallback path

### Settings and persistence
- Engine selection
- Local model selection
- API base URL / model configuration
- Extension language
- Recovery of selected text and engine status

## Differentiators worth preserving

- Local-first privacy positioning
- Ability to keep translation usable even without a full AI setup
- Lightweight browser-side workflow without sending all text to a server by default

## Anti-Features for this refactor

- Expanding into a larger “all-in-one AI suite”
- Adding brand-new modes before the current five are structurally protected
- Reworking settings UX without a clear architecture win
- Rewriting for novelty instead of maintainability

## Refactor implications

- Preserve behavior first, then simplify ownership and boundaries.
- Treat every user trigger path as a required regression path.
- Any requirement that does not help clarity, safety, testability, or docs accuracy should probably wait.
