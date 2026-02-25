# PRD — AI Proofduck

## 1. Overview

**Product Name:** AI Proofduck
**Tagline:** Your AI writing buddy — proofread, summarize, translate, expand.
**Target Users:** Writers, students, professionals, and non-native English speakers who write in the browser.

## 2. Problem Statement

Browser-based writing (emails, docs, social media) often contains errors, awkward phrasing, or needs translation. Existing tools require switching tabs or pasting into external apps. AI Proofduck works inline, right where you write.

## 3. Core Features

### 3.1 Inline Proofreading
- Select text → right-click or keyboard shortcut → instant proofreading
- Red/green diff view showing original vs corrected text
- One-click accept/reject per suggestion

### 3.2 AI Models (Layered)
- **Tier 1:** Chrome built-in AI (Gemini Nano) — zero latency, fully offline
- **Tier 2:** Local WebGPU/WASM models — privacy-first, no API needed
- **Tier 3:** Online APIs (OpenAI, etc.) — highest quality, user-configured

### 3.3 Multi-Function
- 📝 Proofread — grammar, spelling, style
- 📋 Summarize — condense selected text
- 🌐 Translate — between languages
- ✍️ Expand — elaborate on brief notes

### 3.4 Context-Aware
- Detects writing context (email, code comment, social post)
- Adjusts tone and suggestions accordingly

## 4. Technical Architecture

```
┌──────────────────────────────────────┐
│          Chrome Extension            │
│  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │Content │  │Popup   │  │Service │ │
│  │Script  │  │UI      │  │Worker  │ │
│  └───┬────┘  └────────┘  └───┬────┘ │
│      │                       │      │
│  ┌───▼───────────────────────▼────┐ │
│  │       Model Router             │ │
│  │  Nano → WebGPU → Online API    │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## 5. MVP Scope

| Feature | MVP | V2 |
|---------|-----|----|
| Proofread with Gemini Nano | ✅ | |
| Diff view UI | ✅ | |
| Summarize / Translate / Expand | ✅ | |
| WebGPU fallback | | ✅ |
| Custom API endpoint config | | ✅ |
| Per-site preferences | | ✅ |

## 6. Distribution

- Chrome Web Store (primary)
- Edge Add-ons (compatible)

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Chrome Web Store rejection | Follow Manifest V3 strictly, minimal permissions |
| Gemini Nano availability | Graceful fallback to WebGPU/API |
| Privacy concerns | Default to local-first models, clear data policy |
