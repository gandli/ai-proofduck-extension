<div align="center">
  <a href="https://gandli.github.io/ai-proofduck-extension/">
    <img src="public/icons/icon-128.png" alt="Logo AI Proofduck" width="128" height="128" style="border-radius: 24px; box-shadow: 0 12px 40px rgba(237, 80, 7, 0.15);" />
  </a>

  <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">AI Proofduck</h1>

  <p style="font-size: 1.2rem; color: #666;">
    <strong>Assistant d'écriture intelligent · Confidentialité d'abord · Entièrement local</strong> <br/>
    Rendez votre écriture professionnelle, soignée et précise.
  </p>

  <p>
    <a href="#-fonctionnalités">Fonctionnalités</a> •
    <a href="#-synchronisation-des-journaux-de-modifications">Synchronisation du journal</a> •
    <a href="#-tests">Tests</a> •
    <a href="#-confidentialité">Confidentialité</a>
  </p>

  <p>
    🌐 Langues :
    <a href="./README.md">English</a> |
    <a href="./README.zh-CN.md">简体中文</a> |
    <a href="./README.ja.md">日本語</a> |
    <a href="./README.ko.md">한국어</a> |
    <a href="./README.es.md">Español</a> |
    <a href="./README.fr.md">Français</a>
  </p>

  <p>
    <a href="https://astro.build"><img src="https://img.shields.io/badge/Built%20with-Astro%205.0-orange?style=flat-square&logo=astro" alt="Built with Astro"></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Styled%20with-Tailwind-38B2AC?style=flat-square&logo=tailwind-css" alt="Styled with Tailwind CSS"></a>
    <a href="https://lucide.dev"><img src="https://img.shields.io/badge/Icons-Lucide-pink?style=flat-square&logo=lucide" alt="Lucide Icons"></a>
  </p>

  <img src="public/images/screenshots/screenshot-en-summarize.png" alt="Capture d'écran AI Proofduck" width="800" style="border-radius: 12px; border: 1px solid #e5e5e5; margin-top: 20px;" />
</div>

<br />

> **AI Proofduck** est un assistant d'écriture IA conçu en premier lieu pour la traduction, destiné aux panneaux latéraux des navigateurs. Il prend désormais en charge **l'IA intégrée à Chrome**, **l'inférence locale WebGPU/WASM** et une **solution de secours basée sur des API/traductions publiques** (compatibles Google/Baidu/OpenAI), équilibrant ainsi confidentialité, compatibilité et facilité d'utilisation immédiate.

---

## ✨ Fonctionnalités principales

AI Proofduck se concentre sur l'amélioration de la qualité de votre écriture web grâce à cinq modes principaux :

| Mode | Description |
| :--- | :--- |
| **📝 Résumer** | Extraire instantanément les points clés des textes longs pour en saisir l'idée principale. |
| **✅ Corriger** | Identifier et corriger avec précision les erreurs d'orthographe, de grammaire et de ponctuation. |
| **✨ Polir** | Optimiser la formulation et la structure des phrases pour renforcer le professionnalisme et la fluidité. |
| **🌍 Traduire** | Traduction contextuelle entre les principales langues mondiales avec une grande précision. |
| **🚀 Développer** | Enrichir les détails à partir de mots-clés courts pour ajouter de la profondeur et de la logique à votre expression. |

### 🚀 Intelligence hybride

Nous proposons trois chemins d'exécution pour différents environnements :

- **🧠 IA intégrée à Chrome** : Exécutez l'IA directement sur l'appareil dans le panneau latéral de Chrome lorsque cela est disponible.
- **⚡ WebGPU/WASM local** : Accélération locale rapide + compatibilité étendue avec les processeurs.
- **🌍 Traduction/API publique** : Utilisez les services de traduction Google/Baidu ou des API compatibles OpenAI comme solution de secours.

---

## 🔄 Synchronisation du journal des modifications

Le journal des modifications de la page d'accueil `gh-pages` est synchronisé depuis la branche `main` :

- **Page FR** : récupère et affiche automatiquement `main/CHANGELOG.md`.
- **Page ZH** : conserve une copie localisée du journal pour les lecteurs chinois.
- Prend en charge le rendu Markdown intégré dans les éléments du journal :
  - `**gras**`
  - `` `code` ``
  - `[lien](https://example.com)`

Stratégie de rafraîchissement :

- Intervalle d'interrogation : **une fois par jour**
- Rafraîchissement intelligent lors du `focus` de la page et des événements `visibilitychange`

---

## 🧪 Tests

Les tests E2E de la page d'accueil sont alimentés par Playwright.

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

La couverture actuelle inclut :

- Rendu des sections FR/ZH et contenu clé
- Préservation de l'état d'affichage lors du changement de langue
- Comportement du bouton de retour en haut de page
- Rendu dynamique du Markdown dans le journal des modifications

---

## 🔒 Confidentialité d'abord

**Vos données vous appartiennent.**

- **Aucune collecte de données** : Nous ne collectons, stockons ni n'analysons aucun de vos contenus saisis ni informations personnelles.
- **Local d'abord** : Par défaut, les modèles locaux sont utilisés, et le traitement des données s'effectue entièrement sur votre appareil, sans téléchargement vers le cloud.
- **Transparent et contrôlable** : Les clés API sont chiffrées et stockées localement dans `localStorage`, et peuvent être supprimées à tout moment.

Pour des politiques détaillées, veuillez consulter : [Page de politique de confidentialité](https://gandli.github.io/ai-proofduck-extension/#privacy)

---

## 🚀 Détails de la fiche boutique

### 1. Description à usage unique

**AI Proofduck** est un assistant d'écriture intelligent axé sur l'amélioration de la qualité de l'écriture web. Toutes les fonctions (**Résumer**, **Corriger**, **Relire**, **Traduire** et **Développer**) sont étroitement alignées sur l'objectif principal d'« optimisation et traitement du texte ».

### 2. Justifications des autorisations

- **`sidePanel`** : Fournit une interface d'interaction immersive pour l'assistance à l'écriture sans quitter la page actuelle.
- **`storage`** : Stocke localement les préférences utilisateur, les sélections de moteurs et les clés API chiffrées.
- **`tts`** : Fournit la synthèse vocale pour l'accessibilité et la relecture multimodale.
- **`activeTab`** : Respecte le principe du moindre privilège, demandant un accès temporaire à l'onglet actuel uniquement lorsque l'utilisateur déclenche explicitement l'extension.
- **`contextMenus`** : Ajoute un raccourci au menu contextuel (clic droit), servant d'interaction légitime déclenchée par l'utilisateur pour accorder l'accès à `activeTab`.
- **`scripting`** : Utilisé pour lire et traiter en toute sécurité le texte sélectionné depuis la page actuelle lors de l'activation par l'utilisateur.

### 3. Déclaration concernant le code distant

Cette extension **N'UTILISE PAS** de « Code hébergé à distance ». Toute la logique d'exécution (JS/Wasm) est entièrement intégrée dans le package de l'extension, conformément aux exigences de la Politique de Sécurité du Contenu (CSP).

---

<div align="center">
  <p>Licence MIT © 2026 <a href="https://github.com/gandli">Gandli</a></p>
</div>