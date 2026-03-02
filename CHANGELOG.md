# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
<!-- AUTO-UNRELEASED-START -->
- docs(changelog): fill missing v0.1.5 release notes (6839c8c)
- docs(changelog): refresh unreleased section (169350e)
- ci(changelog): auto-refresh Unreleased section on main pushes (0b55aa5)
- chore(docs): move multilingual READMEs into docs/readme (0bc0ea0)
- docs(changelog): update for v0.1.5 (cd95888)
<!-- AUTO-UNRELEASED-END -->

## [v0.1.5] - 2026-03-02

### Added

- **Release automation upgrade**: `workflow_dispatch` now supports optional version input to create tag + release in one flow.
- **BDD coverage for translation routing**: added behavior scenarios for translate-first route selection and fallback behavior.

### Changed

- **Multilingual documentation expansion**: completed structured JA/KO/ES/FR README content.
- **Documentation layout refactor**: moved multilingual READMEs into `docs/readme/` and updated related paths.

### Fixed

- **Translate-first stability**: strengthened i18n and mode-ordering tests to prevent regressions in sidepanel defaults and routing.
- **Repository hygiene**: removed legacy `.Jules` directory to keep release artifacts and docs clean.

## [v0.1.4] - 2026-03-02

### Added

- **Chrome AI direct execution path**: run Gemini Nano from sidepanel context with availability checks.
- **One-click free API fallback** when Chrome AI is unavailable.
- **API presets** in settings for:
  - OpenRouter free
  - Cloudflare AI
- **Translation fallback providers** for install-ready translation experience:
  - Google free translate endpoint
  - MyMemory free API
- **API Key autofocus guidance** after fallback switch.
- **Reviewer submission template**: `docs/cws-reviewer-notes-v0.1.4.md`.

### Changed

- **Product narrative** updated to hybrid engine strategy (local-first + cloud-enhanced + translate fallback) in `README.md` and `README.zh-CN.md`.
- **Store-readiness wording** improved to clarify engine availability dependencies.

### Fixed

- Reduced first-run dead-ends when Chrome AI is not available in reviewer/user environments.

## [v0.1.0] - 2026-02-14

### Added

- **Playwright E2E Tests**: Set up Playwright for end-to-end testing, including tests for language switching, auto-save, and UI components.
- **I18n Support**: Implemented internationalization with Chinese and English support.
- **Settings Persistence**: User settings are now persisted across sessions.
- **Character Count**: Real-time character count display in the editor.
- **Clear Button**: Added functionality to quickly clear the input text.
- **Landing Page**: New landing page for the extension.
- **Privacy Policy**: Added and refined privacy policy display.
- **Store Assets**: Added screenshots and promotional materials for the Chrome Web Store.

### Changed

- **UI Refactoring**: Improved sidepanel UI with separate Proofread and Rewrite sections.
- **State Management**: Optimized settings management by eliminating temporary states.
- **Build System**: Configured WXT for production-ready extension builds.

### Fixed

- **Env Detection**: Fixed issues with environment detection during initialization.
- **Style Issues**: Resolved various layout and styling bugs in the sidepanel.
