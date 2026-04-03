# AI ProofDuck (校对鸭)

<!-- TODO: Replace with actual repo URL -->
<!--
[![GitHub stars](https://img.shields.io/github/stars/your-repo/ai-proofduck-extension?style=social)](https://github.com/your-repo/ai-proofduck-extension)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/stars)](https://chrome.google.com/webstore)
-->

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-19-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Bun](https://img.shields.io/badge/Bun-1.x-yellow)

AI ProofDuck 是一款本地 WebGPU 加速的网页翻译 + 专业审阅校对工具。支持划词即时翻译、校对、润色、扩写等多种 AI 写作辅助功能。

**English** | **中文**

> 如果您觉得这个项目有帮助，请给我们一个 Star！

## 项目简介

校对鸭 (AI ProofDuck) 是一款本地 WebGPU 加速的网页翻译 + 专业审阅校对工具。支持划词即时翻译、校对、润色、扩写等多种 AI 写作辅助功能。

**核心特性**:

- **翻译引擎优先级**: Chrome 内置 AI (Gemini Nano) > 本地 WebGPU/WASM 模型 > OpenAI 兼容 API > 第三方免费翻译
- **多模式写作辅助**: 翻译、摘要、纠错、润色、扩写
- **本地优先隐私保护**: 文本优先在设备侧处理
- **支持中英日三语界面**: 随时切换语言

## Tech Stack

- **WXT** - Browser extension framework
- **React 19** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Zustand** - State management
- **@hxt-dev/i18n** - Internationalization
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## 功能特性

### AI 写作辅助

| 模式 | 功能描述 |
|------|----------|
| 翻译 (Translate) | 精准翻译，支持全文翻译 |
| 摘要 (Summarize) | 快速提炼长文核心观点 |
| 纠错 (Correct) | 修正语法错误与拼写问题 |
| 润色 (Proofread) | 优化语句通顺度，提升专业性 |
| 扩写 (Expand) | 基于现有内容丰富细节 |

### 翻译引擎优先级

1. **Chrome 内置 AI (Gemini Nano)** - 优先启用，享受最佳性能
2. **本地模型** - 有 WebGPU 时走 web-llm，否则使用轻量 WASM 模式
3. **在线 API** - 支持 OpenAI 兼容格式 (OpenAI, DeepSeek, GLM 等)
4. **第三方免费翻译** - 仅翻译模式可用，默认可直接走 Google 翻译

### 智能内容获取

- 支持划词即时处理
- 无选区时自动获取当前页面正文，方便全文摘要

### 界面设计

- **活力橙主题**: 采用 `#FF5A11` 品牌色
- **极致紧凑**: 最大化内容展示空间
- **国际化**: 支持中文、英文、日语界面

## Project Structure

```
ai-proofduck-extension/
├── entrypoints/           # Browser extension entry points
│   ├── background.ts      # Service Worker
│   ├── content.ts         # Content Script
│   └── popup/             # Extension popup UI
│       ├── App.tsx
│       ├── main.tsx
│       └── components/    # Popup components
├── src/                   # Shared source code
│   ├── engines/           # Translation engine adapters
│   ├── core/              # Core functionality (EngineManager, etc.)
│   ├── hooks/             # React hooks
│   ├── stores/            # Zustand state stores
│   ├── types/             # TypeScript type definitions
│   ├── components/         # Shared React components
│   └── utils/             # Utility functions
├── public/
│   └── _locales/          # i18n message files (en, zh, ja)
├── tests/
│   ├── unit/              # Vitest unit tests
│   │   ├── engines/
│   │   ├── core/
│   │   ├── components/
│   │   └── utils/
│   ├── e2e/               # Playwright E2E tests
│   │   └── popup/
│   └── bdd/               # BDD feature files
│       └── features/
├── wxt.config.ts          # WXT configuration
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest configuration
├── playwright.config.ts   # Playwright configuration
└── tailwind.config.js     # TailwindCSS configuration
```

## Commands

```bash
# Development
bun dev              # Start dev server (localhost:3000)
bun dev:firefox      # Firefox development

# Build
bun build            # Production build
bun build:firefox    # Firefox production build
bun zip              # Package as zip
bun zip:firefox      # Firefox zip

# Type checking
bun compile          # TypeScript type check

# Testing
bun test             # Unit tests (Vitest)
bun test:run         # Run tests once
bun test:ui          # Vitest UI
bun test:e2e         # Playwright E2E tests
bun test:e2e:ui      # Playwright UI
bun test:e2e:headed  # Playwright headed mode
```

## Path Aliases

- `@/` → `src/`
- `@entry/` → `entrypoints/`

---

## 快速开始

```bash
# 克隆项目
git clone https://github.com/your-repo/ai-proofduck-extension.git
cd ai-proofduck-extension

# 安装依赖
bun install

# 启动开发服务器
bun dev

# 加载扩展到 Chrome
# 1. 打开 chrome://extensions/
# 2. 开启开发者模式
# 3. 点击"加载已解压的扩展程序"
# 4. 选择 .output/chrome-mv3-dev/ 目录
```

---

## 安装说明

### 环境要求

- [Bun](https://bun.sh/) >= 1.0 (推荐)
- Node.js >= 18 (可选，使用 npm)
- Chrome 128+ / Edge 128+ / Firefox 130+ (支持 Manifest V3)

### 安装步骤

1. 克隆项目到本地
2. 安装依赖：`bun install`
3. 启动开发：`bun dev`
4. 加载扩展到浏览器

### 加载扩展 (Chrome)

1. 打开 `chrome://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `.output/chrome-mv3-dev/` 目录

### 构建发布版本

```bash
# 构建生产版本
bun build

# 打包为 zip
bun zip
```

---

## 使用方法

### 基本使用

1. 点击浏览器工具栏中的扩展图标打开 Popup
2. 划选网页上的文字，选择需要的 AI 模式
3. 查看翻译/校对结果

### AI 模式

| 模式 | 说明 | 快捷键 |
|------|------|--------|
| 翻译 | 精准翻译，支持多语言 | T |
| 摘要 | 提炼长文核心观点 | S |
| 纠错 | 修正语法与拼写错误 | C |
| 润色 | 优化语句通顺度和专业性 | P |
| 扩写 | 基于内容丰富细节 | E |

### 配置 API Key

在扩展设置中配置您偏好的 AI 服务：

| 服务 | 说明 |
|------|------|
| Chrome AI | 优先使用 Chrome 内置 Gemini Nano |
| OpenAI | GPT-4, GPT-3.5 |
| Claude | Anthropic Claude |
| DeepSeek | DeepSeek 模型 |
| Gemini | Google Gemini |
| 本地模型 | WebGPU/WASM 模式 |

---

## 架构说明

### 引擎优先级

```
┌─────────────────────────────────────────┐
│  1. Chrome 内置 AI (Gemini Nano)        │  ← 最高优先级
├─────────────────────────────────────────┤
│  2. 本地 WebGPU/WASM 模型               │
├─────────────────────────────────────────┤
│  3. OpenAI 兼容 API                     │
├─────────────────────────────────────────┤
│  4. 第三方翻译 (Google)                  │  ← 兜底
└─────────────────────────────────────────┘
```

### 模块结构

```
┌──────────────────────────────────────────────────────────┐
│                     entrypoints/                        │
├──────────────┬─────────────────────┬────────────────────┤
│  background  │      content.ts     │       popup/       │
│ (Service     │   (Content Script)  │    (React UI)      │
│  Worker)     │                     │                    │
└──────────────┴─────────────────────┴────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                        src/                              │
├──────────┬───────────┬──────────┬───────────┬───────────┤
│ engines/ │   core/   │  hooks/  │  stores/  │    i18n   │
│ 引擎适配  │ EngineMgr │  React   │  Zustand  │ 国际化    │
└──────────┴───────────┴──────────┴───────────┴───────────┘
```

---

## 贡献指南

欢迎提交 Pull Request 和 Issue！详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## API 文档

详见 [API.md](./API.md)。

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | Claude Code 开发指南 |
| [AGENTS.md](./AGENTS.md) | Agent 开发规范 |
| [API.md](./API.md) | API 文档 |

---

## 许可证

MIT License
