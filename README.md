<div align="center">
  <h1>AI proofduck</h1>
  <img src="public/icons/icon-128.png" alt="AI proofduck Logo" width="128" height="128" />

<p>
  <a href="https://github.com/gandli/ai-proofduck-extension/releases/latest"><img src="https://img.shields.io/github/v/release/gandli/ai-proofduck-extension?style=flat-square&label=release" alt="Latest release" /></a>
  <a href="https://github.com/gandli/ai-proofduck-extension/actions/workflows/build-extension.yml"><img src="https://img.shields.io/github/actions/workflow/status/gandli/ai-proofduck-extension/build-extension.yml?style=flat-square&label=build" alt="Build status" /></a>
  <img src="https://img.shields.io/badge/tests-269%20unit%20%2B%20e2e-brightgreen?style=flat-square" alt="Unit tests" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
</p>

[中文](./README.zh-CN.md) | [Changelog](./CHANGELOG.md)
</div>

**AI proofduck** is an intelligent writing assistant extension for your browser sidepanel. Powered by advanced AI models (supporting both local WebGPU/WASM and online APIs), it provides real-time summarization, polishing, error correction, translation, and expansion of text.

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

## ✨ Features

- **🚀 Multi-Mode Writing Assistance**: Summarize · Correct · Proofread · Translate · Expand.
- **🎯 Selection Bubble**: Select any text on any webpage → floating bubble translates instantly. Dark Shadow DOM, host-page style isolation guaranteed.
- **🔒 Privacy First (Local Models)**: Run LLMs locally via WebGPU/WASM (e.g., Qwen2.5). Your data never leaves your browser.
- **🌐 Online Model Support**: Compatible with OpenAI-format APIs (BYOK). API keys stay in `chrome.storage.local`, never sent anywhere except your chosen endpoint.
- **🔐 Permission on Demand**: Migrated from `<all_urls>` to `optional_host_permissions` — grant origins via the Authorize button on the Options page.
- **📊 Engine Health Dashboard**: Real-time badges (chrome-ai / webllm / openai-compat / free-translate) show which engine is ready and which needs setup.
- **📑 Smart Content Fetching**: Process selected text instantly, or auto-fetch the page body for full-page summarization.
- **🎨 Brand-Unified UI**: Warm yellow theme, compact layout, full English + Chinese localization.

## 📦 Installation

### [Install from Chrome Web Store](https://chromewebstore.google.com/detail/gpjneodcglcajciglofbfhafgncgfmcn/)

## ⚙️ Configuration

Access settings via the gear icon in the sidepanel header or next to the mode selector.

- **Engine Selection**:
  - **Local (WebGPU)**: GPU-accelerated local inference (requires model download).
  - **Local (WASM)**: CPU-based local inference (slower but broader compatibility).
  - **Online API**: Standard OpenAI-compatible APIs (requires API Key & Base URL).
- **Language**: Toggle extension interface language.
- **Model Parameters**: Configure `model` name when using Online API.

---

## 🛠️ Development

Built with [WXT](https://wxt.dev/), React, and TypeScript.

### Prerequisites

- Node.js >= 18
- [Bun](https://bun.sh/) (CI uses Bun 1.2)

### Quick Start

1. **Clone the repo**

   ```bash
   git clone https://github.com/gandli/ai-proofduck-extension
   cd ai-proofduck-extension
   ```

2. **Install dependencies**

   ```bash
   bun install   # or: npm install
   ```

3. **Start Development Server** — loads the extension in Chrome with HMR enabled:

   ```bash
   bun run dev    # or: npm run dev
   ```

4. **Build for Production** — output lands in `.output/`:

   ```bash
   bun run build  # or: npm run build
   ```

### Quality Gate

Every push to `main` and every tag runs the QA gate before packaging (see [`build-extension.yml`](.github/workflows/build-extension.yml)):

```bash
bun run compile             # tsc --noEmit, 0 error required
bun run lint                # eslint --max-warnings=0
bun run test                # vitest run, coverage thresholds: stmts≥90 / branches≥85 / funcs≥85 / lines≥92
```

If any gate fails, the workflow aborts — no artifacts, no release.

### Testing

```bash
bun run test          # unit tests (vitest)
bun run test:e2e      # Playwright E2E against a real extension build
```

### More Docs

- [CHANGELOG.md](CHANGELOG.md) — version history
- [docs/chrome-web-store-listing.md](docs/chrome-web-store-listing.md) — store listing details & permission justifications

## 🔐 CI / Release · CRX Extension ID Stability

The GitHub Actions workflow builds signed CRX packages using a **repository secret** `CRX_KEY` (PKCS#8 RSA-2048 private key). This guarantees a **stable extension ID** across every release, so users on privately-distributed builds get seamless auto-updates.

- **Secret name**: `CRX_KEY`
- **Format**: PKCS#8 PEM (`-----BEGIN PRIVATE KEY-----`)
- **Rotation**: `openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt | gh secret set CRX_KEY` (⚠️ new key = new extension ID → breaks existing installs)
- **Fallback**: If the secret is unset (fork / PR from external contributor), the workflow generates an **ephemeral key** for build smoke-testing only. Such builds are **never released**.

## 📄 License

[MIT](LICENSE)
