<div align="center">
  <h1>AI proofduck</h1>
  <img src="../../public/icon.svg" alt="AI proofduck Logo" width="128" height="128" />
</div>

[English](../../README.md) | [中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Changelog](../../CHANGELOG.md)

---

## 📸 Captures d’écran

Voir les captures dans `store-assets/`.

---

**AI proofduck** est une extension d’assistance à l’écriture IA hybride pour le panneau latéral du navigateur.

**Stratégie local-first** :
1. Chrome Built-in AI (Gemini Nano)
2. Modèles locaux WebGPU/WASM
3. API en ligne pour une meilleure qualité
4. Fallback de traduction pour un usage immédiat après installation

## ✨ Fonctionnalités

- **UX orientée traduction**
  - **Translate** : traduction multilingue (y compris page entière)
  - **Summarize / Correct / Proofread / Expand**
- **Confidentialité local-first** : traitement local prioritaire
- **Voie cloud-enhanced** : API compatibles OpenAI
- **Fallback de traduction** : garde la traduction disponible sans moteur AI/API key
- **Récupération intelligente du contenu** : si aucun texte n’est sélectionné, récupération du corps de page

## 📦 Installation

### [Installer depuis Chrome Web Store](https://chromewebstore.google.com/detail/gpjneodcglcajciglofbfhafgncgfmcn/)

---

## ⚙️ Configuration

- **Moteurs**
  - Chrome Built-in AI
  - Local (WebGPU / WASM)
  - Online API
- **Presets online**
  - OpenRouter free
  - Cloudflare AI
- **Fallback de traduction**
  - Disabled / Google free / MyMemory

## 🛠️ Développement

```bash
git clone https://github.com/gandli/ai-proofduck-extension
cd ai-proofduck-extension
npm install
npm run dev
```

Build :

```bash
npm run build
```

---

## 📄 Licence

[MIT](../../LICENSE)
