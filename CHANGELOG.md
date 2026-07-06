# Changelog

All notable changes to this project will be documented in this file.

## [v0.3.2] - 2026-07-06 · Patch (P0 covering all engines)

### 🚨 Fixed — P0：v0.3.1 只修了 free-translate 一条链路，另外 3 条也是 CORS 死的

v0.3.1 加了 `translate.googleapis.com` 修好 free-translate；但**其他 3 个引擎在扩展页面同样会被 CORS 静默拦截**：

| 引擎 | 被拦的域名 |
|---|---|
| `free-translate` | `translate.googleapis.com` ✅（v0.3.1 已修） |
| `webllm` | `huggingface.co`（权重）+ `raw.githubusercontent.com`（WASM 库） |
| `openai-compat` | 用户任意 baseUrl（`api.openai.com` / `api.deepseek.com` / `api.groq.com` / 本地 vLLM 端点...） |
| `chrome-ai` | 走 Chrome 内置 `Translator` API，不 fetch，不受影响 ✅ |

### 修复

`wxt.config.ts` 补齐所有引擎需要的 `host_permissions`：

```typescript
host_permissions: [
  'https://translate.googleapis.com/*',        // free-translate
  'https://huggingface.co/*',                  // webllm 权重
  'https://raw.githubusercontent.com/*',       // webllm WASM 库
  '<all_urls>',                                 // openai-compat（用户任意 baseUrl）
],
```

**关于 `<all_urls>`**：openai-compat 的 `baseUrl` 完全由用户在 Options 页填入（可能是 OpenAI 官方 / DeepSeek / Groq / 内网 vLLM / 本地 Ollama...），无法枚举。安全模型：API Key 由用户自己持有并只写入 `chrome.storage.local`，扩展本身不发送任何数据到第三方。`<all_urls>` 只是让 fetch 不被 CORS 拒，不代表扩展会主动扫描全网。

## [v0.3.1] - 2026-07-06 · Patch

### 🚨 Fixed — P0：免费翻译引擎在扩展页面被 CORS 拒

`manifest.json` 缺少 `host_permissions`，导致扩展页面（SidePanel / Popup / Options）
调用免费翻译引擎（Google 公开端点）时被 CORS 静默拦截，翻译永远卡在 loading。

- `wxt.config.ts` 添加 `host_permissions: ['https://translate.googleapis.com/*']`
- 通过端到端 demo spec 验证：SidePanel 翻译 "Machine learning is amazing." → "机器学习是惊人的。"
- 划词浮标翻译 60 字英文 → "机器学习是人工智能的一个子领域。"

### Added — 端到端 demo 契约

- `tests/e2e/demo.spec.ts`：全功能截图 + 录屏 spec，用作发版前 smoke test
  - Stub `navigator.gpu` 避免 pickBest 落到 WebLLM 卡 950MB 模型下载
  - 起本地 HTTP server（file:// 不注入 CS）
  - 用中文关键词（"机器"/"学习"/"智能"/"人工"）验证真实译文而非仅"有中文字符"

## [v0.3.0] - 2026-07-06

**划词浮标**——从"必须打开侧边栏"升级到"网页任何地方选中即翻"。
参照 DeepL / 沉浸式翻译的浮标交互模式。**193 单测 + 14 E2E** 护航。

### Added — 划词浮标

- **SelectionBubble 组件**：4 态状态机（idle/loading/success/error），选区右下角定位
- **useSelection v2**：暴露 `rect: DOMRect` 供浮标定位，`minLength` 防单字符误触，rAF 拖蓝节流
- **content script**：`entrypoints/content.tsx` 挂 Shadow DOM 避免宿主页样式污染
- **EngineManager 集成**：点浮标 → `pickBest()` → 走已配置引擎链
- **E2E 真扩展验证**：Playwright launchPersistentContext + 本地 HTTP + Shadow DOM 断言

### Fixed — Gemini/CodeRabbit review 修复

- **Shadow DOM 事件重定向**：用 `composedPath()` 判定点击是否在浮标内（原生 contains 在 Shadow 里假 false）
- **异步竞态**：`requestIdRef` 令牌 pickBest / run / catch 三处校验，取消选中再选同一段也不会覆盖新状态
- **拖蓝 layout thrashing**：debounceMs=0 时用 `requestAnimationFrame` 推到下一帧
- **纯空白选区**：`.trim()` 过滤空格/换行/tab
- **content script 重复注入**：SPA / hot reload 时 main() 里 `getElementById` 幂等

### Known limitations（明确 punt 到 v0.4）

- Shadow DOM 里 Tailwind CSS 未生效——当前 inline style 兜底
- 浮标越视口边缘不翻转
- 页面滚动时浮标不跟随（rect 是选中瞬间快照）
- build 6.24 MB → 11.96 MB（content script 打包 react + engines）

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
