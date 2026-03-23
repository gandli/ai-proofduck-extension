# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**
- TypeScript 5.9.x - All extension source code, tests, and configuration

**Secondary:**
- CSS - Tailwind-driven styling for sidepanel and content popup
- Markdown - Product docs and planning artifacts

## Runtime

**Environment:**
- Browser extension runtime for Chromium-family browsers
- Node.js 18+ for local development and build tasks

**Package Manager:**
- npm-compatible project
- Bun is already supported by the README and CI guidance
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- WXT 0.20.x - Browser extension framework and bundling
- React 19.2.x - Sidepanel UI rendering

**Testing:**
- Vitest 4.0.x - Unit and component tests
- Playwright 1.48.x - End-to-end extension tests
- Testing Library 16.3.x - React rendering assertions

**Build/Dev:**
- TypeScript 5.9.x - Type checking
- Tailwind CSS 3.4.x - Utility styling
- PostCSS / Autoprefixer - CSS processing

## Key Dependencies

**Critical:**
- `@mlc-ai/web-llm` 0.2.74 - Local model inference for WebGPU/WASM execution
- `@wxt-dev/module-react` 1.1.5 - React integration for WXT entrypoints
- `react` / `react-dom` 19.2.x - UI runtime

**Infrastructure:**
- `@types/chrome` 0.1.36 - Chrome extension API typing
- `happy-dom` 20.6.x and `jsdom` 28.1.x - Browser-like test environments

## Configuration

**Environment:**
- No required `.env` file in repo
- Online API credentials are user-provided inside extension settings at runtime
- API key persistence intentionally uses browser session storage

**Build:**
- `wxt.config.ts` - Extension manifest and output configuration
- `tsconfig.json` - TypeScript compiler options
- `vitest.config.ts` - Unit test runner setup
- `playwright.config.ts` - E2E test runner setup

## Platform Requirements

**Development:**
- macOS/Linux/Windows with Node.js 18+
- Chromium browser for extension testing

**Production:**
- Browser extension package built into `dist/`
- Chromium APIs used include `sidePanel`, `storage`, `tts`, `activeTab`, `contextMenus`, and `offscreen`

---
*Stack analysis: 2026-03-23*
*Update after major dependency or runtime changes*
