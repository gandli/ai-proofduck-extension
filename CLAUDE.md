# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI ProofDuck is a browser extension (Manifest V3) for AI-powered proofreading and translation. Built with WXT + React 19 + TypeScript.

**Tech Stack**: WXT, React 19, TypeScript, TailwindCSS, Zustand, @hxt-dev/i18n

## Commands

```bash
# Development
bun dev              # Start dev server (localhost:3000)
bun dev:firefox      # Firefox development

# Build
bun build            # Production build
bun build:firefox    # Firefox production build
bun zip              # Package as zip
bun zip:firefox      # Firefox zip

# Type checking
bun compile          # TypeScript type check

# Testing
bun test             # Unit tests (Vitest)
bun test:run         # Run tests once
bun test:ui          # Vitest UI
bun test:e2e         # Playwright E2E tests
bun test:e2e:ui      # Playwright UI
bun test:e2e:headed  # Playwright headed mode
```

## Architecture

### Entrypoints (Browser Extension Entry Points)
- `entrypoints/background.ts` - Service Worker
- `entrypoints/content.ts` - Content Script
- `entrypoints/popup/` - Extension Popup UI (React)

### Source Structure
- `src/` - Shared code (i18n, hooks, stores, utils, components, types)
- `public/_locales/` - i18n message files (en, zh, ja)
- `public/icon/` - Extension icons

### Path Aliases
- `@/` → `src/`
- `@entry/` → `entrypoints/`

### Build Output
- Dev: `.output/chrome-mv3-dev/`
- Prod: `.output/chrome-mv3-prod/`

## Key Patterns

**i18n**: Use `t('key')` from `@/i18n`
**State**: Zustand stores with `persist` middleware for chrome.storage
**Testing**: Vitest for unit tests, Playwright for E2E (E2E tests load from `.output/`)

## Additional Guidelines

For detailed development guidelines, code style, component patterns, and testing approach, see **AGENTS.md** - it contains comprehensive project-specific guidance in Chinese.
