<div align="center">
  <h1>AI 校对鸭 (AI Proofduck)</h1>
  <img src="public/icon.svg" alt="AI Proofduck Logo" width="128" height="128" />
  <p>智能写作助手 · 隐私优先 · 本地全能</p>
</div>

<div align="center">
  <a href="#-核心功能">核心功能</a> •
  <a href="#-安装与开发">安装开发</a> •
  <a href="#-项目结构">项目结构</a> •
  <a href="#-配置说明">配置说明</a>
</div>

<br />

[English](#ai-proofduck) | [中文](#ai-校对鸭)

---

# AI 校对鸭

**AI 校对鸭** 是一款基于浏览器侧边栏的智能写作助手扩展。它利用先进的 AI 模型，为您提供实时的文本摘要、校对、润色、翻译和扩写服务。

### 🚀 为什么选择 AI 校对鸭？

- **🔒 隐私核心**：内置 WebGPU/WASM 引擎（如 Qwen2.5），数据完全在本地处理，不出浏览器。
- **⚡ 极致体验**：支持划词触发，自动正文识别，侧边栏交互简洁流畅。
- **🌐 灵活引擎**：既可完全本地运行，也支持连接您偏好的 OpenAI 兼容云端 API。

## ✨ 核心功能

- **多模式写作辅助**：
  - **摘要 (Summarize)**：瞬间提取长文核心要点。
  - **校对 (Correct)**：识别并修复语法、拼写和标点错误。
  - **润色 (Polish)**：优化措辞，使表达更专业、更通顺。
  - **翻译 (Translate)**：支持中英互译及多语言处理。
  - **扩写 (Expand)**：根据简短关键词生成丰富的细节描述。
- **现代化架构**：
  - **落地页**：使用 [Astro](https://astro.build/) 构建的高性能组件化站点。
  - **浏览器扩展**：基于 [WXT](https://wxt.dev/) + React 框架开发。
- **开发者友好**：
  - 内置 Playwright E2E 自动化测试。
  - 完善的国际化 (I18n) 双语支持。

## 🛠️ 安装与开发

### 环境要求

- Node.js >= 18
- pnpm / npm / bun

### 快速开始

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd ai-proofduck-extension
   ```

2. **安装依赖**

   ```bash
   bun install  # 推荐使用 bun
   # 或
   npm install
   ```

3. **运行落地页 (Astro)**

   ```bash
   npm run dev  # 启动 Astro 开发服务器，访问 http://localhost:4321
   ```

4. **开发扩展 (WXT)**

   ```bash
   # 此命令会在 Chrome 中加载扩展并开启热重载
   npm run extension:dev
   ```

5. **运行测试**

   ```bash
   npx playwright test
   ```

## 📁 项目结构

- `src/pages/` - Astro 落地页源码（包含首页、[更新日志](/changelog)、[隐私政策](/privacy)）
- `src/components/` - Astro 公共组件
- `entrypoints/` - WXT 扩展入口文件（Sidepanel, Content Scripts 等）
- `public/` - 静态资源与多语言 JSON 数据
- `tests/` - Playwright E2E 测试脚本

---

# AI Proofduck

An intelligent writing assistant for your browser sidepanel.
Privacy-first, AI-powered, and fully customizable.

## ✨ Key Features

- **🚀 Multi-Mode Writing**: Summarize, Correct, Polish, Translate, and Expand.
- **🔒 Privacy First**: Local LLM support via WebGPU/WASM. No data tracking.
- **🌐 Hybrid Engines**: Switch between local models and Online APIs (OpenAI compatible).
- **🎨 Modern Stack**: Built with Astro (Landing Page) and WXT (Extension).

## 🛠️ Development

### Setup

```bash
bun install
```

### Running the Site

```bash
npm run dev
```

### Running the Extension

```bash
npm run extension:dev
```

## 📄 License

MIT © [Gandli](https://github.com/gandli)
