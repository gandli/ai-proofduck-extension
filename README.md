<div align="center">
  <h1>AI proofduck</h1>
  <img src="public/icon.svg" alt="AI proofduck Logo" width="128" height="128" />
</div>

[中文](./README.zh-CN.md) | [Changelog](./CHANGELOG.md)

---

## 📸 Screenshots

<div align="center">
  <table style="width: 100%; border-collapse: collapse; border: none;">
    <tr>
      <td align="center" style="border: none;">
        <img src="store-assets/screenshot-en-summarize.png" width="300" alt="Summarize Feature" /><br/>
        <sub>Summarize Interface</sub>
      </td>
      <td align="center" style="border: none;">
        <img src="store-assets/screenshot-en-translate.png" width="300" alt="Translate Feature" /><br/>
        <sub>Translate Interface</sub>
      </td>
    </tr>
    <tr>
      <td align="center" style="border: none;">
        <img src="store-assets/screenshot-zh-proofread.png" width="300" alt="Proofread Feature" /><br/>
        <sub>Proofread (Chinese)</sub>
      </td>
      <td align="center" style="border: none;">
        <img src="store-assets/screenshot-zh-settings.png" width="300" alt="Settings Interface" /><br/>
        <sub>Settings Panel</sub>
      </td>
    </tr>
  </table>
</div>

---

**AI proofduck** is an intelligent writing assistant extension for your browser sidepanel. Powered by advanced AI models (supporting both local WebGPU/WASM and online APIs), it provides real-time summarization, pivoting, proofreading, translation, and expansion of text.

Currently at **v0.4.0** — brand-unified UI, engine health dashboard, dark selection bubble, and permission-on-demand.

## ✨ Features

- **🚀 Multi-Mode Writing Assistance**:
  - **Summarize**: Quickly extract key points from long texts.
  - **Correct**: Fix grammar and spelling errors.
  - **Proofread**: Polish sentences for better flow and professionalism.
  - **Translate**: Accurate translation between languages.
  - **Expand**: Enrich details based on existing content.
- **🎯 Selection Bubble** (v0.3+): Select any text on any webpage → floating bubble translates instantly. Dark Shadow DOM, host-page style isolation guaranteed.
- **🔒 Privacy First (Local Models)**: Run LLMs locally via WebGPU/WASM (e.g., Qwen2.5). Your data never leaves your browser.
- **🌐 Online Model Support**: Compatible with OpenAI-format APIs for connecting to powerful cloud models. BYOK — API keys stay in `chrome.storage.local`, never sent anywhere except your chosen endpoint.
- **🔐 Permission on Demand** (v0.4): Migrated from `<all_urls>` to `optional_host_permissions`. Grant origins via the **Authorize button on the Options page** — translation checks state only and prompts a CTA when missing.
- **📊 Engine Health Dashboard** (v0.4): Real-time badges (chrome-ai / webllm / openai-compat / free-translate) show which engine is ready and which needs setup.
- **📑 Smart Content Fetching**:
  - Process selected text instantly.
  - Automatically fetch page body content when no text is selected for full-page summarization.
- **🎨 Brand-Unified UI** (v0.4):
  - **Warm Yellow Theme**: `#f59f00` brand + `#fff9db` background + `#495057` ink — matches our duck mascot 🦆.
  - **Compact Layout**: Maximized vertical space for content.
  - **i18n Support**: Full English and Chinese localization.

## 📦 Installation

### [Install from Chrome Web Store](https://chromewebstore.google.com/detail/gpjneodcglcajciglofbfhafgncgfmcn/)

---

## 🛠️ Development

Built with [WXT](https://wxt.dev/), React, and TypeScript.

### Prerequisites

- Node.js >= 18
- pnpm / npm / yarn / bun

### Quick Start

1. **Clone the repo**

   ```bash
   git clone https://github.com/gandli/ai-proofduck-extension
   cd ai-proofduck-extension
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   bun install
   ```

3. **Start Development Server**
   Loads the extension in Chrome with HMR enabled.

   ```bash
   npm run dev
   # or
   bun dev
   ```

4. **Build for Production**

   ```bash
   npm run build
   ```

   Outputs are generated in the `.output/` directory.

## ⚙️ Configuration

Access settings via the gear icon in the sidepanel header or next to the mode selector.

- **Engine Selection**:
  - **Local (WebGPU)**: GPU-accelerated local inference (requires model download).
  - **Local (WASM)**: CPU-based local inference (slower but broader compatibility).
  - **Online API**: Use standard OpenAI-compatible APIs (requires API Key & Base URL).
- **Language**: Toggle extension interface language.
- **Model Parameters**: Configure `model` name when using Online API.

## 🚀 Store Listing Details

### 1. Single Purpose Description

AI proofduck is an intelligent writing assistant focused on **improving the quality of web-based writing**. All functions (Summarize, Correct, Proofread, Translate, and Expand) are tightly aligned with the core goal of **"text optimization and processing."**

### 2. Permission Justifications

- **sidePanel**: Provides an immersive interaction interface for writing assistance without leaving the current page.
- **storage**: Locally stores user preferences, engine selections, and encrypted API keys.
- **tts**: Provides text-to-speech for accessibility and multi-modal proofreading.
- **activeTab**: Adheres to the principle of least privilege, requesting temporary access to the current tab only when the user explicitly triggers the extension.
- **contextMenus**: Adds a shortcut to the right-click menu, serving as a legitimate user-triggered interaction to grant `activeTab` access.

### 3. Remote Code Declaration

**This extension DOES NOT use any "Remote Hosted Code"**. All execution logic (JS/Wasm) is fully bundled within the extension package, complying with Content Security Policy (CSP) requirements.

---

## 📄 License

[MIT](LICENSE)
