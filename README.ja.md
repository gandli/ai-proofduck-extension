<div align="center">
  <h1>AI proofduck</h1>
  <img src="public/icon.svg" alt="AI proofduck Logo" width="128" height="128" />
</div>

[English](./README.md) | [中文](./README.zh-CN.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Changelog](./CHANGELOG.md)

---

## 📸 スクリーンショット

同梱の `store-assets/` を参照してください。

---

**AI proofduck** はブラウザのサイドパネルで動作するハイブリッド AI ライティング拡張です。

**ローカル優先ルーティング**:
1. Chrome Built-in AI（Gemini Nano）
2. Local WebGPU/WASM モデル
3. Online API（高品質クラウド）
4. 翻訳専用フォールバック（インストール直後の可用性確保）

## ✨ 主な機能

- **翻訳優先 UX**
  - **Translate**: 多言語翻訳（全文翻訳を含む）
  - **Summarize / Correct / Proofread / Expand**
- **ローカル優先のプライバシー**: 可能な限り端末内で処理
- **クラウド強化**: OpenAI 互換 API（OpenRouter / Cloudflare など）
- **翻訳フォールバック**: AI 利用不可時でも翻訳を継続
- **スマート本文取得**: 未選択時にページ本文を取得

## 📦 インストール

### [Chrome Web Store からインストール](https://chromewebstore.google.com/detail/gpjneodcglcajciglofbfhafgncgfmcn/)

---

## ⚙️ 設定

- **Engine**
  - Chrome Built-in AI
  - Local (WebGPU / WASM)
  - Online API
- **Online Presets**
  - OpenRouter free
  - Cloudflare AI
- **Translation Fallback**
  - Disabled / Google free / MyMemory

## 🛠️ 開発

```bash
git clone https://github.com/gandli/ai-proofduck-extension
cd ai-proofduck-extension
npm install
npm run dev
```

Build:

```bash
npm run build
```

---

## 📄 ライセンス

[MIT](LICENSE)
