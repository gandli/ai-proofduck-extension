<div align="center">
  <h1>AI proofduck</h1>
  <img src="../../public/icon.svg" alt="AI proofduck Logo" width="128" height="128" />
</div>

[English](../../README.md) | [中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Changelog](../../CHANGELOG.md)

---

## 📸 Capturas

Consulta las capturas en `store-assets/`.

---

**AI proofduck** es una extensión híbrida de asistencia de escritura para el panel lateral del navegador.

**Estrategia local-first**:
1. Chrome Built-in AI (Gemini Nano)
2. Modelos locales WebGPU/WASM
3. API online para mayor calidad
4. Fallback de traducción para uso inmediato tras instalar

## ✨ Funciones

- **UX orientada a traducción**
  - **Translate**: traducción multilingüe (incluye traducción de página completa)
  - **Summarize / Correct / Proofread / Expand**
- **Privacidad local-first**: prioriza procesamiento en el dispositivo
- **Ruta cloud-enhanced**: APIs compatibles con OpenAI
- **Fallback de traducción**: mantiene traducción cuando faltan motor AI o API key
- **Obtención inteligente de contenido**: si no hay selección, captura el cuerpo de la página

## 📦 Instalación

### [Instalar desde Chrome Web Store](https://chromewebstore.google.com/detail/gpjneodcglcajciglofbfhafgncgfmcn/)

---

## ⚙️ Configuración

- **Motores**
  - Chrome Built-in AI
  - Local (WebGPU / WASM)
  - Online API
- **Presets online**
  - OpenRouter free
  - Cloudflare AI
- **Fallback de traducción**
  - Disabled / Google free / MyMemory

## 🛠️ Desarrollo

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

## 📄 Licencia

[MIT](../../LICENSE)
