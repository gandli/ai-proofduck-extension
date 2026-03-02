<div align="center">
  <a href="https://gandli.github.io/ai-proofduck-extension/">
    <img src="public/icons/icon-128.png" alt="AI 校对鸭 Logo" width="128" height="128" style="border-radius: 24px; box-shadow: 0 12px 40px rgba(237, 80, 7, 0.15);" />
  </a>

  <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">AI 校对鸭</h1>

  <p style="font-size: 1.2rem; color: #666;">
    <strong>智能写作助手 · 隐私优先 · 完全本地</strong> <br/>
    让您的写作更加专业、精致和精准。
  </p>

  <p>
    <a href="#-核心功能">核心功能</a> •
    <a href="#-更新日志同步">更新日志同步</a> •
    <a href="#-测试">测试</a> •
    <a href="#-隐私保护">隐私保护</a>
  </p>

  <p>
    🌐 语言版本:
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

  <img src="public/images/screenshots/screenshot-en-summarize.png" alt="AI 校对鸭 截图" width="800" style="border-radius: 12px; border: 1px solid #e5e5e5; margin-top: 20px;" />
</div>

<br />

> **AI 校对鸭** 是一款面向浏览器侧边栏的翻译优先型 AI 写作助手。现在支持 **Chrome 内置 AI**、**本地 WebGPU/WASM 推理** 和 **公共翻译/API 兜底**（兼容 Google/Baidu/OpenAI），在隐私保护、兼容性和即时可用性之间取得平衡。

---

## ✨ 核心功能

AI 校对鸭专注于通过五种核心模式提升您的网页写作质量：

| 模式 | 描述 |
| :--- | :--- |
| **📝 总结** | 立即从长文本中提取关键要点，快速掌握核心思想。 |
| **✅ 校正** | 精准识别并修正拼写、语法和标点符号错误。 |
| **✨ 润色** | 优化措辞和句子结构，提升专业性和流畅度。 |
| **🌍 翻译** | 基于上下文感知，在主要全球语言间进行高精度翻译。 |
| **🚀 扩展** | 基于简短关键词丰富细节，为您的表达增添深度和逻辑性。 |

### 🚀 混合智能

我们为不同环境提供三种引擎路径：

- **🧠 Chrome 内置 AI**：在 Chrome 侧边栏中直接运行设备端 AI（可用时）。
- **⚡ 本地 WebGPU / WASM**：快速本地加速 + 广泛的 CPU 兼容性。
- **🌍 公共翻译与 API**：使用 Google/Baidu 翻译服务或 OpenAI 兼容 API 作为兜底方案。

---

## 🔄 更新日志同步

`gh-pages` 落地页的更新日志从 `main` 分支同步：

- **英文页面**：自动获取并渲染 `main/CHANGELOG.md`。
- **中文页面**：为中文读者保留本地化的更新日志副本。
- 支持更新日志项目中的内联 Markdown 渲染：
  - `**粗体**`
  - `` `代码` ``
  - `[链接](https://example.com)`

刷新策略：

- 轮询间隔：**每天一次**
- 页面 `focus` 和 `visibilitychange` 时的智能刷新

---

## 🧪 测试

落地页的端到端测试由 Playwright 驱动。

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

当前覆盖范围包括：

- 英文/中文部分渲染和关键文案
- 语言切换视图状态保持
- 返回顶部按钮行为
- 动态更新日志 Markdown 渲染

---

## 🔒 隐私优先

**您的数据属于您自己。**

- **零数据收集**：我们不会收集、存储或分析您的任何输入内容或个人信息。
- **本地优先**：默认使用本地模型，数据处理完全在您的设备上完成，无需上传到云端。
- **透明且可控**：API 密钥经过加密并本地存储在 `localStorage` 中，可随时删除。

详细政策请访问：[隐私政策页面](https://gandli.github.io/ai-proofduck-extension/#privacy)

---

## 🚀 商店列表详情

### 1. 单一用途描述

**AI 校对鸭** 是一款专注于提升网页写作质量的智能写作助手。所有功能（**总结**、**校正**、**校对**、**翻译**和**扩展**）都紧密围绕"文本优化和处理"这一核心目标。

### 2. 权限说明

- **`sidePanel`**：提供沉浸式写作辅助交互界面，无需离开当前页面。
- **`storage`**：本地存储用户偏好设置、引擎选择和加密的 API 密钥。
- **`tts`**：提供文本转语音功能，用于无障碍访问和多模态校对。
- **`activeTab`**：遵循最小权限原则，仅在用户明确触发扩展时临时请求当前标签页访问权限。
- **`contextMenus`**：在右键菜单中添加快捷方式，作为合法的用户触发交互来授予 `activeTab` 访问权限。
- **`scripting`**：在用户激活时安全地读取和处理当前页面的选中文本。

### 3. 远程代码声明

此扩展**不使用**任何"远程托管代码"。所有执行逻辑（JS/Wasm）都完全打包在扩展包内，符合内容安全策略（CSP）要求。

---

<div align="center">
  <p>MIT 许可证 © 2026 <a href="https://github.com/gandli">Gandli</a></p>
</div>