<div align="center">
  <a href="https://gandli.github.io/ai-proofduck-extension/">
    <img src="public/icons/icon-128.png" alt="AI Proofduck Logo" width="128" height="128" style="border-radius: 24px; box-shadow: 0 12px 40px rgba(237, 80, 7, 0.15);" />
  </a>

  <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">AI Proofduck</h1>

  <p style="font-size: 1.2rem; color: #666;">
    <strong>スマートなライティングアシスタント · プライバシー最優先 · 完全ローカル</strong> <br/>
    あなたの文章をプロフェッショナルで洗練された、正確なものにします。
  </p>

  <p>
    <a href="#-features">機能</a> •
    <a href="#-changelog-sync">チェンジログ同期</a> •
    <a href="#-testing">テスト</a> •
    <a href="#-privacy">プライバシー</a>
  </p>

  <p>
    🌐 言語:
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

  <img src="public/images/screenshots/screenshot-en-summarize.png" alt="AI Proofduck Screenshot" width="800" style="border-radius: 12px; border: 1px solid #e5e5e5; margin-top: 20px;" />
</div>

<br />

> **AI Proofduck** はブラウザサイドパネル向けの翻訳ファーストAIライティングアシスタントです。現在、**Chrome組み込みAI**、**ローカルWebGPU/WASM推論**、および**パブリック翻訳/APIフォールバック**（Google/Baidu/OpenAI互換）をサポートしており、プライバシー、互換性、即時使用性のバランスを取っています。

---

## ✨ コア機能

AI Proofduckは、5つのコアモードでウェブベースのライティング品質を向上させることに焦点を当てています：

| モード | 説明 |
| :--- | :--- |
| **📝 要約** | 長文から主要なポイントを即座に抽出し、要点を把握します。 |
| **✅ 修正** | スペル、文法、句読点のエラーを正確に特定して修正します。 |
| **✨ 磨き上げ** | 表現や文章構造を最適化し、プロフェッショナリズムと流れを向上させます。 |
| **🌍 翻訳** | 主要なグローバル言語間で文脈を意識した高精度な翻訳を提供します。 |
| **🚀 拡張** | 短いキーワードに基づいて詳細を豊かにし、表現に深みと論理性を加えます。 |

### 🚀 ハイブリッドインテリジェンス

異なる環境向けに3つのエンジンパスを提供しています：

- **🧠 Chrome組み込みAI**: 利用可能な場合、Chromeサイドパネル内で直接オンデバイスAIを実行します。
- **⚡ ローカルWebGPU / WASM**: 高速なローカルアクセラレーション + 広範なCPU互換性。
- **🌍 パブリック翻訳 & API**: Google/Baidu翻訳サービスまたはOpenAI互換APIをフォールバックとして使用します。

---

## 🔄 チェンジログ同期

`gh-pages` ランディングページのチェンジログは `main` ブランチから同期されます：

- **ENページ**: `main/CHANGELOG.md` を自動的に取得してレンダリングします。
- **ZHページ**: 中国語読者のためにローカライズされたチェンジログのコピーを保持します。
- チェンジログ項目内のインラインマークダウンレンダリングをサポート：
  - `**太字**`
  - `` `コード` ``
  - `[リンク](https://example.com)`

更新戦略：

- ポーリング間隔: **1日1回**
- ページの `focus` および `visibilitychange` イベントでのスマート更新

---

## 🧪 テスト

ランディングページのE2EテストはPlaywrightによって実行されます。

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

現在のカバレッジ：

- EN/ZHセクションのレンダリングと主要コピー
- 言語切り替え時のビューステート保持
- 戻るボタンの動作
- 動的チェンジログマークダウンレンダリング

---

## 🔒 プライバシー最優先

**あなたのデータはあなた自身のものです。**

- **ゼロデータ収集**: 入力コンテンツや個人情報を収集、保存、分析しません。
- **ローカルファースト**: ローカルモデルをデフォルトとし、データ処理はすべてデバイス内で完結し、クラウドにアップロードしません。
- **透明性と制御性**: APIキーは暗号化され、`localStorage` にローカルに保存され、いつでも削除可能です。

詳細なポリシーについてはこちらをご覧ください: [プライバシーポリシーページ](https://gandli.github.io/ai-proofduck-extension/#privacy)

---

## 🚀 ストア掲載詳細

### 1. 単一目的の説明

**AI Proofduck** はウェブベースのライティング品質向上に特化したインテリジェントライティングアシスタントです。すべての機能（**要約**、**修正**、**校正**、**翻訳**、**拡張**）は「テキストの最適化と処理」というコア目標に密接に整合しています。

### 2. 権限の正当性

- **`sidePanel`**: 現在のページから離れることなく、没入型のライティング支援インタフェースを提供します。
- **`storage`**: ユーザー設定、エンジン選択、暗号化されたAPIキーをローカルに保存します。
- **`tts`**: アクセシビリティとマルチモーダル校正のためにテキスト読み上げを提供します。
- **`activeTab`**: 最小権限の原則に従い、ユーザーが明示的に拡張機能をトリガーした場合にのみ現在のタブへの一時的なアクセスを要求します。
- **`contextMenus`**: 右クリックメニューにショートカットを追加し、`activeTab` アクセスを許可する正当なユーザー起因のインタラクションとして機能します。
- **`scripting`**: ユーザーがアクティベートした際に、現在のページから選択されたテキストを安全に読み取り処理するために使用されます。

### 3. リモートコード宣言

この拡張機能は**「リモートホストコード」を一切使用しません**。すべての実行ロジック（JS/Wasm）は拡張機能パッケージ内に完全にバンドルされており、コンテンツセキュリティポリシー（CSP）要件に準拠しています。

---

<div align="center">
  <p>MIT License © 2026 <a href="https://github.com/gandli">Gandli</a></p>
</div>