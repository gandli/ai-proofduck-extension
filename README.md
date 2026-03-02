<div align="center">
  <a href="https://gandli.github.io/ai-proofduck-extension/">
    <img src="public/icons/icon-128.png" alt="AI Proofduck Logo" width="128" height="128" style="border-radius: 24px; box-shadow: 0 12px 40px rgba(237, 80, 7, 0.15);" />
  </a>

  <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">AI Proofduck</h1>

  <p style="font-size: 1.2rem; color: #666;">
    <strong>Smart Writing Assistant · Privacy First · Fully Local</strong> <br/>
    Make your writing professional, polished, and precise.
  </p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#-changelog-sync">Changelog Sync</a> •
    <a href="#-testing">Testing</a> •
    <a href="#-privacy">Privacy</a>
  </p>

  <p>
    <a href="https://astro.build"><img src="https://img.shields.io/badge/Built%20with-Astro%205.0-orange?style=flat-square&logo=astro" alt="Built with Astro"></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Styled%20with-Tailwind-38B2AC?style=flat-square&logo=tailwind-css" alt="Styled with Tailwind CSS"></a>
    <a href="https://lucide.dev"><img src="https://img.shields.io/badge/Icons-Lucide-pink?style=flat-square&logo=lucide" alt="Lucide Icons"></a>
  </p>

  <img src="public/images/screenshots/screenshot-en-summarize.png" alt="AI Proofduck Screenshot" width="800" style="border-radius: 12px; border: 1px solid #e5e5e5; margin-top: 20px;" />
</div>

<br />

> **AI Proofduck** is a translate-first AI writing assistant for browser side panels. It now supports **Chrome Built-in AI**, **local WebGPU/WASM inference**, and **public translation/API fallback** (Google/Baidu/OpenAI-compatible), balancing privacy, compatibility, and instant usability.

---

## ✨ Core Features

AI Proofduck focuses on improving the quality of your web-based writing with five core modes:

| Mode | Description |
| :--- | :--- |
| **📝 Summarize** | Instantly extract key points from long texts to grasp the main idea. |
| **✅ Correct** | Precisely identify and fix spelling, grammar, and punctuation errors. |
| **✨ Polish** | Optimize phrasing and sentence structure to enhance professionalism and flow. |
| **🌍 Translate** | Context-aware translation across major global languages with high accuracy. |
| **🚀 Expand** | Enrich details based on short keywords to add depth and logic to your expression. |

### 🚀 Hybrid Intelligence

We provide three engine paths for different environments:

- **🧠 Chrome Built-in AI**: Run on-device AI directly in Chrome sidepanel when available.
- **⚡ Local WebGPU / WASM**: Fast local acceleration + broad CPU compatibility.
- **🌍 Public Translation & API**: Use Google/Baidu translation services or OpenAI-compatible APIs as fallback.

---

## 🔄 Changelog Sync

The `gh-pages` landing page changelog is synced from `main` branch:

- **EN page**: fetches and renders `main/CHANGELOG.md` automatically.
- **ZH page**: keeps localized changelog copy for Chinese readers.
- Supports inline markdown rendering in changelog items:
  - `**bold**`
  - `` `code` ``
  - `[link](https://example.com)`

Refresh strategy:

- Polling interval: **once per day**
- Smart refresh on page `focus` and `visibilitychange`

---

## 🧪 Testing

Landing page E2E tests are powered by Playwright.

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Current coverage includes:

- EN/ZH section rendering and key copy
- language switch view-state preservation
- back-to-top button behavior
- dynamic changelog markdown rendering

---

## 🔒 Privacy First

**Your data belongs to you.**

- **Zero Data Collection**: We do not collect, store, or analyze any of your input content or personal information.
- **Local First**: Defaulting to local models, data processing is completed entirely on your device, without uploading to the cloud.
- **Transparent & Controllable**: API keys are encrypted and stored locally in `localStorage`, and can be deleted at any time.

For detailed policies, please visit: [Privacy Policy Page](https://gandli.github.io/ai-proofduck-extension/#privacy)

---

## 🚀 Store Listing Details

### 1. Single Purpose Description

**AI Proofduck** is an intelligent writing assistant focused on improving the quality of web-based writing. All functions (**Summarize**, **Correct**, **Proofread**, **Translate**, and **Expand**) are tightly aligned with the core goal of "text optimization and processing."

### 2. Permission Justifications

- **`sidePanel`**: Provides an immersive interaction interface for writing assistance without leaving the current page.
- **`storage`**: Locally stores user preferences, engine selections, and encrypted API keys.
- **`tts`**: Provides text-to-speech for accessibility and multi-modal proofreading.
- **`activeTab`**: Adheres to the principle of least privilege, requesting temporary access to the current tab only when the user explicitly triggers the extension.
- **`contextMenus`**: Adds a shortcut to the right-click menu, serving as a legitimate user-triggered interaction to grant `activeTab` access.
- **`scripting`**: Used to safely read and process the selected text from the current page upon user activation.

### 3. Remote Code Declaration

This extension **DOES NOT** use any "Remote Hosted Code". All execution logic (JS/Wasm) is fully bundled within the extension package, complying with Content Security Policy (CSP) requirements.

---

<div align="center">
  <p>MIT License © 2026 <a href="https://github.com/gandli">Gandli</a></p>
</div>
