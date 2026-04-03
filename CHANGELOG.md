# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [v1.0.0-phase1] - 2026-04-03

### 🚀 Phase 1 Complete Release

#### Features

**Core Features (M1-M6)**
- ✅ Project initialization with WXT + React 19 + TypeScript
- ✅ Translation engine adapter architecture (Google Translate)
- ✅ Sidebar UI with 4 tabs (Translate, Proofread, Polish, Expand)
- ✅ Full page translation with bilingual display
- ✅ Local AI models support (Chrome AI, WebGPU, WASM)
- ✅ LLM API integration (OpenAI, Claude, DeepSeek, Qwen, Gemini)

**Enhanced Features (M7-M13)**
- ✅ Test coverage improvement (107+ tests)
- ✅ Code quality (ESLint, Prettier)
- ✅ Documentation (README, CONTRIBUTING, API docs)
- ✅ Performance optimization (LRU cache, lazy loading)
- ✅ Accessibility (ARIA, keyboard navigation)
- ✅ i18n support (7 languages: zh, en, ja, ko, fr, de, es)
- ✅ Speech TTS (Chrome Speech + Edge TTS)

#### Technical Stack
- WXT - Browser extension framework
- React 19 - UI framework
- TypeScript - Type safety
- TailwindCSS - Styling
- Zustand - State management
- Vitest - Unit testing
- Playwright - E2E testing
- GitHub Actions - CI/CD

#### Translation Engines (9 Adapters)
1. Google Translate - General translation
2. OpenAI (GPT) - LLM API
3. Claude (Anthropic) - LLM API
4. DeepSeek - LLM API
5. Qwen (Alibaba) - LLM API
6. Gemini (Google) - LLM API
7. Chrome AI (Gemini Nano) - Local, offline
8. WebGPU (Qwen2.5, Llama) - Local, GPU accelerated
9. WASM (NLLB-200) - Local, CPU based

#### Supported Languages
- 中文 (zh-CN, zh-TW)
- English (en-US, en-GB)
- 日本語 (ja-JP)
- 한국어 (ko-KR)
- Français (fr-FR)
- Deutsch (de-DE)
- Español (es-ES)
- Русский (ru-RU)

#### Speech Voices
- Chrome Speech Synthesis (offline, default)
- Edge TTS WebSocket (high quality, online)
  - 17+ neural voices across multiple languages

---

[Previous releases would be listed here]
