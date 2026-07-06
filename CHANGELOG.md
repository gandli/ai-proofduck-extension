# Changelog

All notable changes to this project will be documented in this file.

## [v0.2.0] - 2026-07-06

TDD 全量重构 + 完整四层引擎链路。装完扩展**零配置即可翻译**，高级用户
可配 API key 走自己端点，隐私党可全关联网兜底。168 单测护航。

### Added — 引擎链路

- **chrome-ai (100)**：Chrome 138+ 内置 Translator，隐私满分，仅翻译模式
- **webllm (90)**：WebGPU 本地推理（Qwen2.5-1.5B / 950MB），中文优化，全 5 模式
- **openai-compat (70)**：BYOK 兼容 OpenAI / DeepSeek / 通义千问 / 豆包 / Kimi，SSE 流式
- **free-translate (60)**：Google 公开端点（`client=gtx`）终极兜底，无需 key

引擎按优先级自动降级，`EngineManager` 处理不可用/失败切换。

### Added — Options 页

- **OpenAI 兼容配置**：5 个快捷预设一键填 baseUrl / model
- **API Key 掩码 + 显隐切换**（防旁人窥屏），存 `chrome.storage.local` 不同步
- **测试连接**：GET `/v1/models` 三态展示（成功 / HTTP 错 / 网络错）
- **免费翻译隐私开关**：明确告知"会发送到 Google 服务器"，一键关闭

### Added — 工具层

- `formatErrorMessage()`：Error / 字符串 / null / 裸带 message 对象（如 `chrome.runtime.lastError`）统一格式化
- `TranslationCache`：LRU + TTL（100 条 / 1h）翻译结果缓存，`useTranslate` 已接入
- 引擎间共用 `defineStorage` 分区语义（`sync` 偏好 / `local` 密钥）

### Changed

- **架构重构**：M1 骨架 → 四件套（popup / sidepanel / options / content）+ 引擎抽象
- **测试基线**：37 → 168 单测，TDD RED-GREEN-REFACTOR 全流程
- **打包**：build 大小 6.23 MB（含 WebLLM WASM）

### Fixed — Bot Review 采纳

- **SSE 分隔符**：兼容 `\n\n` 和 `\r\n\r\n`（Nginx / Cloudflare / 阿里云网关都会重写）
- **`joinUrl` 智能识别 `/v1`**：用户填 DeepSeek 官方文档写的 `https://api.deepseek.com/v1` 不重复拼
- **`reader.cancel()` on break**：用户中途终止不泄漏 SSE 连接
- **`formatErrorMessage` 处理裸对象**：`chrome.runtime.lastError` 是无 Error 原型带 message 的对象

### Contributors

- @gandli
- 🤖 Bot review: Gemini（11 条被采纳）/ CodeRabbit / GitGuardian / Sourcery
- 🤖 Google Jules AI Agent（#454 / #455 精神采纳到 #458）

---

## [v0.1.0] - 2026-02-14

（老版本，见 git 历史。M1 及以前的独立编辑器架构已在 v0.2.0 完全重构。）

### Added
- Playwright E2E Tests
- I18n Support (zh-CN / en)
- Settings Persistence
- Character Count
- Clear Button
- Landing Page
- Privacy Policy
- Store Assets

### Changed
- UI Refactoring (Proofread + Rewrite sections)
- State Management
- Build System (WXT)

### Fixed
- Env Detection
- Style Issues
