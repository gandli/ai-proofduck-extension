<div align="center">
  <a href="https://gandli.github.io/ai-proofduck-extension/">
    <img src="public/icons/icon-128.png" alt="Logotipo de AI Proofduck" width="128" height="128" style="border-radius: 24px; box-shadow: 0 12px 40px rgba(237, 80, 7, 0.15);" />
  </a>

  <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">AI Proofduck</h1>

  <p style="font-size: 1.2rem; color: #666;">
    <strong>Asistente de escritura inteligente · Privacidad primero · Totalmente local</strong> <br/>
    Haz que tu escritura sea profesional, pulida y precisa.
  </p>

  <p>
    <a href="#-características">Características</a> •
    <a href="#-sincronización-del-registro-de-cambios">Sincronización del registro de cambios</a> •
    <a href="#-pruebas">Pruebas</a> •
    <a href="#-privacidad">Privacidad</a>
  </p>

  <p>
    🌐 Idiomas:
    <a href="./README.md">English</a> |
    <a href="./README.zh-CN.md">简体中文</a> |
    <a href="./README.ja.md">日本語</a> |
    <a href="./README.ko.md">한국어</a> |
    <a href="./README.es.md">Español</a> |
    <a href="./README.fr.md">Français</a>
  </p>

  <p>
    <a href="https://astro.build"><img src="https://img.shields.io/badge/Construido%20con-Astro%205.0-orange?style=flat-square&logo=astro" alt="Construido con Astro"></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Estilizado%20con-Tailwind-38B2AC?style=flat-square&logo=tailwind-css" alt="Estilizado con Tailwind CSS"></a>
    <a href="https://lucide.dev"><img src="https://img.shields.io/badge/Iconos-Lucide-pink?style=flat-square&logo=lucide" alt="Iconos Lucide"></a>
  </p>

  <img src="public/images/screenshots/screenshot-en-summarize.png" alt="Captura de pantalla de AI Proofduck" width="800" style="border-radius: 12px; border: 1px solid #e5e5e5; margin-top: 20px;" />
</div>

<br />

> **AI Proofduck** es un asistente de escritura con IA orientado a la traducción para paneles laterales del navegador. Ahora admite **IA integrada de Chrome**, **inferencia local WebGPU/WASM** y **alternativas públicas de traducción/API** (compatibles con Google/Baidu/OpenAI), equilibrando privacidad, compatibilidad y usabilidad inmediata.

---

## ✨ Características principales

AI Proofduck se centra en mejorar la calidad de tu escritura basada en web con cinco modos principales:

| Modo | Descripción |
| :--- | :--- |
| **📝 Resumir** | Extrae instantáneamente los puntos clave de textos largos para comprender la idea principal. |
| **✅ Corregir** | Identifica y corrige con precisión errores ortográficos, gramaticales y de puntuación. |
| **✨ Pulir** | Optimiza la redacción y la estructura de las oraciones para mejorar el profesionalismo y la fluidez. |
| **🌍 Traducir** | Traducción con conciencia contextual entre los principales idiomas globales con alta precisión. |
| **🚀 Expandir** | Enriquece detalles basados en palabras clave cortas para añadir profundidad y lógica a tu expresión. |

### 🚀 Inteligencia híbrida

Proporcionamos tres rutas de motor para diferentes entornos:

- **🧠 IA integrada de Chrome**: Ejecuta IA en el dispositivo directamente en el panel lateral de Chrome cuando esté disponible.
- **⚡ WebGPU/WASM local**: Aceleración local rápida + amplia compatibilidad con CPU.
- **🌍 Traducción pública y API**: Utiliza servicios de traducción de Google/Baidu o APIs compatibles con OpenAI como alternativa.

---

## 🔄 Sincronización del registro de cambios

El registro de cambios de la página de destino `gh-pages` se sincroniza desde la rama `main`:

- **Página EN**: obtiene y renderiza automáticamente `main/CHANGELOG.md`.
- **Página ES**: mantiene una copia localizada del registro de cambios para lectores hispanohablantes.
- Admite renderizado de markdown en línea en los elementos del registro de cambios:
  - `**negrita**`
  - `` `código` ``
  - `[enlace](https://ejemplo.com)`

Estrategia de actualización:

- Intervalo de sondeo: **una vez al día**
- Actualización inteligente al hacer `focus` en la página y en eventos `visibilitychange`

---

## 🧪 Pruebas

Las pruebas E2E de la página de destino están impulsadas por Playwright.

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

La cobertura actual incluye:

- Renderizado de secciones EN/ES y texto clave
- Preservación del estado de vista al cambiar de idioma
- Comportamiento del botón de volver arriba
- Renderizado dinámico de markdown en el registro de cambios

---

## 🔒 Privacidad primero

**Tus datos te pertenecen a ti.**

- **Cero recopilación de datos**: No recopilamos, almacenamos ni analizamos ninguno de tus contenidos introducidos ni información personal.
- **Primero lo local**: Por defecto se utilizan modelos locales, y el procesamiento de datos se completa completamente en tu dispositivo, sin subirlo a la nube.
- **Transparente y controlable**: Las claves API se cifran y almacenan localmente en `localStorage`, y se pueden eliminar en cualquier momento.

Para políticas detalladas, visita: [Página de política de privacidad](https://gandli.github.io/ai-proofduck-extension/#privacy)

---

## 🚀 Detalles del listado en la tienda

### 1. Descripción de propósito único

**AI Proofduck** es un asistente de escritura inteligente centrado en mejorar la calidad de la escritura basada en web. Todas las funciones (**Resumir**, **Corregir**, **Revisar**, **Traducir** y **Expandir**) están estrechamente alineadas con el objetivo principal de "optimización y procesamiento de texto".

### 2. Justificaciones de permisos

- **`sidePanel`**: Proporciona una interfaz de interacción inmersiva para la asistencia de escritura sin salir de la página actual.
- **`storage`**: Almacena localmente las preferencias del usuario, selecciones de motor y claves API cifradas.
- **`tts`**: Proporciona conversión de texto a voz para accesibilidad y corrección multimodal.
- **`activeTab`**: Se adhiere al principio de privilegio mínimo, solicitando acceso temporal a la pestaña actual solo cuando el usuario activa explícitamente la extensión.
- **`contextMenus`**: Añade un acceso directo al menú contextual, sirviendo como una interacción legítima iniciada por el usuario para otorgar acceso a `activeTab`.
- **`scripting`**: Se utiliza para leer y procesar de forma segura el texto seleccionado de la página actual tras la activación del usuario.

### 3. Declaración de código remoto

Esta extensión **NO** utiliza ningún "Código alojado remotamente". Toda la lógica de ejecución (JS/Wasm) está completamente empaquetada dentro del paquete de la extensión, cumpliendo con los requisitos de la Política de Seguridad de Contenido (CSP).

---

<div align="center">
  <p>Licencia MIT © 2026 <a href="https://github.com/gandli">Gandli</a></p>
</div>