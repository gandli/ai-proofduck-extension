# Chrome Web Store 上架素材 · v0.5.2

## 关键 URL（提交时填）

| 字段 | URL |
|------|-----|
| **主页** | https://gandli.github.io/ai-proofduck-extension/ |
| **隐私政策**（英文，CWS 主填） | https://gandli.github.io/ai-proofduck-extension/#privacy |
| **隐私政策**（中文备用） | https://gandli.github.io/ai-proofduck-extension/zh/#privacy |
| **支持 URL** | https://github.com/gandli/ai-proofduck-extension/issues |
| **源代码** | https://github.com/gandli/ai-proofduck-extension |

## 1. 商店名称（≤45 字）

**中文** · 校对鸭 · AI 翻译润色，选中即弹
**English** · Proofduck — AI Translate & Proofread on Selection

## 2. 简短描述（≤132 字，商店卡片副标题）

选中文字自动弹泡翻译 · 支持 Chrome 内置 AI、WebLLM、OpenAI 兼容后端 · 全本地 / 自建 API 二选一 · 数据永不上传第三方

## 3. 详细描述（16k 字上限，实际 800 字左右够用）

**校对鸭**是一款隐私优先的浏览器 AI 助手，专注**选中即翻译**的极致体验。

### ✨ 核心功能

- **弹泡翻译** · 网页上选中任意文字，翻译浮标即时出现在选区旁
- **侧边栏工作台** · Alt+Shift+P 打开，支持长文本粘贴 + 双向翻译
- **多引擎融合**
  - Chrome 内置 AI（`window.ai`，Chrome 138+，完全本地无网络）
  - WebLLM（浏览器内运行 Qwen/Llama，GPU 加速）
  - OpenAI 兼容（DeepSeek / Qwen / 自建 vLLM / OpenRouter…）
  - 免费在线兜底

### 🔐 隐私安全

- **零数据上传第三方**：仅在你自选的引擎和自填的 API 端点之间通信
- **API Key 只存 `chrome.storage.local`**，绝不同步到 sync（避免云端同步到你的其他设备）
- **完全开源**：https://github.com/gandli/ai-proofduck-extension

### 🎨 界面

- 米色樱粉品牌色 · 温和护眼
- **Dark Mode 自动跟随系统**（v0.5.0）
- 空/加载/错误三态明确提示（v0.5.1）
- 键盘全流程可达 · focus-visible 无障碍支持

### 🛠️ 权限说明

| 权限 | 用途 |
|------|------|
| `sidePanel` | 打开侧边栏工作台 |
| `storage` | 保存你的引擎选择和 API 配置 |
| `contextMenus` | 右键"翻译选中"入口 |
| `activeTab` | 读取当前页选中文字（仅点击弹泡时） |
| `commands` | 键盘快捷键 Alt+Shift+P |
| `optional_host_permissions: <all_urls>` | **可选**权限，你启用弹泡时按需授权 |

**不会**：读取表单密码 · 上传浏览历史 · 追踪用户

### 📖 使用

1. 首次装完点扩展图标 → 打开侧边栏
2. 设置页选择引擎（推荐先试 Chrome 内置 AI，零配置）
3. 需要外部 API 时到 Options 页填 baseUrl / apiKey / model
4. 在网页选中文字 → 弹泡自动出现 → 点小鸭图标翻译

### 🐛 反馈

- Issues: https://github.com/gandli/ai-proofduck-extension/issues
- 开源 MIT 协议

## 4. 类别

**主要**：Productivity（生产力工具）
**次要**：Accessibility（无障碍）

## 5. 语言

`zh_CN` 主 · `en` 副
