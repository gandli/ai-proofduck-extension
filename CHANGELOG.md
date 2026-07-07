# Changelog

All notable changes to this project will be documented in this file.

## [v0.5.3] - 2026-07-07 · 全量审计闭环 · 安全强化

### 🛡️ 安全 & 稳定性收尾（4 个 PR）

- **P0-1（#501）**：`fetch` 无超时 → 引入 `createFetchAbortHandle`，所有引擎 AbortController 全链路串联；避免用户断网时永久 hang
- **P1-1（#502）**：`SelectionBubble` 组件覆盖率 67.74% → **100%**（+27 单测）
- **P1-2（#503）**：`sanitizeSecrets` 提到 `@utils/error` 单点收口，`formatErrorMessage` 出口内嵌脱敏；Gemini review 抓到 Bearer 字符集需覆盖 Base64 全字符（`+/=~`）
- **P1-3（#504）**：`makeCacheKey` 加 `engineId` + `model` 维度，防跨引擎/跨模型缓存污染；`openai-compat` engine 用 storage watch 维护 model 快照

### 🔒 供应链归零

- `bun audit` 从 36 vulnerabilities（1 crit / 19 high）→ **0 vulnerabilities**
- 通过 `package.json` overrides + resolutions 强制升级 picomatch/shell-quote/tmp/uuid/esbuild 到 fixed 版

### 🧪 测试基线

- 单测 314 → **333** (+19，全绿)
- E2E **43/43** 全绿
- 覆盖率 lines **93.04%**（error.ts 100% · SelectionBubble 100%）

### 📝 文档

- `entrypoints/background.ts` 明确壳文件规约（禁在此写业务逻辑）

## [v0.5.2] - 2026-07-07 · UX 系列收尾 · shortcuts + badge + popup

### ⌨️ 键盘快捷键

- `chrome.commands` 声明 `open-side-panel` → `Alt+Shift+P`（跨平台，避开 Chrome 内置 Cmd/Ctrl+Shift+P）
- background 桥接快捷键 → `sidePanel.open`
- 用户可在 `chrome://extensions/shortcuts` 自定义

### 🎖️ 图标 Badge

- `openai-compat` 配置健康度提示
- 全空/齐全 → 无 badge；缺 key/model → 橙 `!`
- background 从 `chrome.storage` 首读 + watch 变化

### 📐 Popup 加宽

- w-72 (288px) → w-80 (320px)，避免长引擎名截断

### 🏗️ 架构

- background 抽出 3 可测模块 `src/background/{lifecycle,badge,badge-state}.ts`
- entrypoints/background.ts 只做 wxt defineBackground 壳

### 🩹 关键修复

- **CodeRabbit 硬伤**：`sidePanel.open` 用户手势保护（await getCurrent 会消耗 gesture context）
- 改用 `commands.onCommand` 回调第二参 `tab.windowId` 同步取
- 新增回归单测 `expect(getCurrent).not.toHaveBeenCalled()`

### ✅ 验收

- tsc 0 err · lint 0 warn · 单测 290/290 · E2E 43/43

---

## [v0.5.1] - 2026-07-07 · UX polish · 三态 + focus-visible

### 🎬 sidepanel 输出区三态改造

- **空状态** → 补 3 条 hint 引导（粘贴/⌘+↵ 快捷键/弹泡）
- **加载态** → 从 ⏳ emoji → 骨架块（shimmer + `aria-busy` + `prefers-reduced-motion`）+ 按钮内 `pd-btn-dot` 脉动圆点
- **错误态** → 独立"重试"按钮，键盘可达 + focus-visible

### ⌨️ focus-visible 全站补齐

- `.pd-plush-input` / `.pd-plush-select` / `.pd-plush-swap` 加 `outline: 2px solid brand-500`

### 🧪 TDD

- 3 UX 单测（空态引导 / 错误重试 / 加载骨架）
- 修 vitest module-level cache 污染陷阱（用独特文本隔离）

### ✅ 验收

- 单测 268/268 · E2E 43/43 · Vision AI 空态打分 8/10

---

## [v0.5.0] - 2026-07-07 · Dark Mode 跟随系统

### 🌙 Dark Mode

- Tailwind `darkMode: 'media'` · `@media (prefers-color-scheme: dark)`
- 主背景 `#14100B` · 卡片 `#33291D` · border `#5A4C36`
- brand-300 dark override `#C89A3E`（避免 logo 光晕泛浅金）
- 全站 CSS 变量覆盖（`--brand-*` / `--ink-*` / `--beige-*`）

### 🎨 Options 页

- 引擎健康度卡重构 `.pd-plush-health-card`（原内联 style 有斜光问题）
- Vision AI 打分：6.5 → **8.5**

### 🧪 TDD

- 新增 E2E `tests/e2e/dark-mode.spec.ts`（emulateMedia + 截图对比）
- 6 张亮/暗对照截图（sidepanel / popup / options × light/dark）

### 🩹 关键修复

- CodeRabbit 硬伤：`.pd-plush-input` @media dark 重复定义（死代码删除）
- CodeRabbit 硬伤：dark `--brand-300` 变量未覆盖（补 `#C89A3E`）

### ✅ 验收

- 单测 265/265 · E2E 42/42 · a11y `>=3` focusable elements

---

## [v0.4.2] - 2026-07-07 · 米色樱粉色板 + 审计修复

### 🎨 色彩重构

- 主色板从「毛绒黄 #f59f00」→ 「米金 #C89A3E」（<10% 面积主 CTA）
- bg 从 brand-50 → beige-50 `#FDFAF2`（`bg-paper`）
- 樱粉点缀 `#F5C3B8` + 鸭蛋蓝 `#7CC4D0`

### 🔧 v0.4.1 全量审计后的修复（fuck-my-shit-mountain skill）

- **P1-1**：`canTranslate` 未拦超长输入 — 用户点【翻译】能把 20k 字发出去
  烧 openai key / 卡 webllm UI。修：`canTranslate += !isOver` + 超长提示 + 单测
- **P1-2**：`pickBest()` 不看 `supports(mode)` — 未来加 Summarizer 引擎会崩
  修：`pickBest(mode?: EngineMode)` + 3 调用点 + 3 条单测
- **P1-3**：vitest coverage 漏 entrypoints/（718 loc 3 App 组件）
  修：`include: ['src/**', 'entrypoints/**']` + PopupApp / OptionsApp 单测
- **P2-3**：CHANGELOG 残留 💛 → 「译」中文纸片
- **P2-4**：message-bus `console.error(err)` 直接打 raw err（err.stack 含用户输入）
  修：改用 `formatErrorMessage(err)` 脱敏
- **P2-2** 部分：Options 引擎健康度标题 🩺 → 纯文字

### ✨ 视觉细节

- 译文框改用 `.pd-plush-input` 白纸底 `#FFFEFB` + 米边 · 与输入框视觉孪生
- 去浮空「译」标签 · 去左粉线 · min-h 140px · focus 樱粉光晕
- Options 引擎健康度卡片：樱粉→米色渐变

### ✅ 验收基线

- tsc / lint 0 warn / build ok
- 单测 **265 tests / 26 files** 全绿（v0.4.1 是 247/24）
- coverage：`{statements:92 branches:85 functions:87 lines:94}`（含 entrypoints/）
- E2E **42 tests** 全绿（含 demo 录屏）

---

## [v0.4.1] - 2026-07-07 · Plush Duckling UI + a11y

### 🎨 Plush Duckling 可爱风视觉

从 3 个可爱风方向（毛绒 / 像素 / 涂鸦贴纸）中选定「毛绒小鸭」方向落地：

- 品牌 logo：7×7 img → 44×44 毛绒圆容器 + 呼吸动画 + 腮红伪元素
- Header 底色：单色渐变 → 双云 radial + brand-100 天空
- 引擎徽章：扁平胶囊 → 毛绒软卡片 + hover 抬升
- Language select / textarea：直角灰边 → 圆角胶囊 + 黄色 focus 光晕
- Swap 按钮：32×32 灰边 → 34×34 品牌黄圈 + 180° hover
- 主 CTA：直角黄底 → 24px 大圆角 + 三色渐变 + inset 高光
- 输出卡：直角 brand-50 → 20px 圆角 + 「译」中文纸片标签（Sidepanel 独享，v0.4.2 已改与输入框视觉对齐）+ 更柔阴影

### 🧹 品牌纯化 · 全站移除鸭子 emoji

- slogan、README、注释、UI 图标位一律清除鸭子 emoji
- 划词浮标翻译按钮的 emoji 装饰 → `<img src=icon-16.png>`（复用品牌图标）
- 品牌视觉一律走 `public/icon.svg` 派生的 icon-*.png

### ♿️ a11y · axe-core 全入口扫描

- 新增 `tests/e2e/a11y.spec.ts`：SidePanel · Popup · Options 三大入口
- 覆盖 wcag2a + wcag2aa 规则集（关闭 color-contrast 因 gradient 半透误报多）
- 修复 `html-has-lang` serious 违规：三个 index.html 加 `lang="zh-CN"`
- 键盘可达 Tab 序 smoke test

### 🔧 采纳 review 建议

- Gemini：`rounded-2xl` 用 `border-radius:24px !important` 显式覆盖
- Gemini：`.pd-plush-output` 拆分基础 / 装饰（`.pd-plush-output-tagged`）
- CodeRabbit：**首次单 PR APPROVED**

### ✅ 验收基线

- tsc 0 err · lint 0 err/0 warn · 单测 247/247 · E2E 30/30（+4 a11y）· build ok

## [v0.4.0] - 2026-07-07 · 品牌统一 + 引擎健康度 + 深色 Bubble

### 🎨 UI/UX 重设计

**品牌色统一**：`#f59f00`（brand-yellow-500）+ `#fff9db`（brand-yellow-50）+ `#495057`（ink-700），
告别 v0.3 的 vibrant orange `#FF5A11`，与品牌吉祥物"鸭"更贴合。

- **Popup**：品牌黄操作按钮 + 引擎徽章（chrome-ai / webllm / openai-compat / free-translate）
- **SidePanel**：引擎健康度条（就绪 = 品牌黄 · 不可用 = ink-500）+ 徽章闪烁修复（`available === true` 严格判断）
- **Options**：健康度卡实时响应 `chrome.storage.onChanged`（Gemini review 采纳）
- **SelectionBubble**：深色 Shadow DOM 浮标（`--pd-ink-900` 底色 + `--pd-brand` 高亮），
  用 CSS vars 保持宿主页样式隔离契约

### 🔐 权限治理（v0.4 核心）

**从 `<all_urls>` 迁移到 `optional_host_permissions`** —— 用户在 Options 页点「授权」时才向 Chrome
调用 `chrome.permissions.request()`；翻译流只检查权限状态，缺失时展示 CTA 引导。
更少的默认权限 = 更低的 Chrome Web Store 审核阻力。

- `manifest_version: 3` + `optional_host_permissions: ['<all_urls>']`
- `chrome.permissions.request()` UX 引导 + `PermissionRequiredError` 类
- Options 页「授权」按钮 · 权限变化事件监听
- `.tmp/google_api_key` 是 Chrome 内嵌 FCM 公钥（Dependabot false-positive，已在 secret scan 标记）

### 🧹 代码质量

- **ESLint type-aware lint 首次落地**（PR #485）：
  - `typescript-eslint@8` + `projectService: true` 自动发现 tsconfig
  - `.codacy.yaml` 让云端读仓库 flat config
  - 采纳 CodeRabbit 2 条 actionable：细粒度 `checksVoidReturn: { attributes: false }` + src/ 恢复 `no-unsafe-*` 保护
  - 采纳 Gemini 5 条：`STUB_ENGINE` Promise.resolve · SelectionBubbleHost 渲染阶段状态重置替代 useEffect
- **首次达成 0 err · 0 warn** lint gate
- `Button.tsx` VARIANT_CLASS 用 `Map` 避免 detect-object-injection 误报

### ✅ 测试基线

- **tsc**: 0 err
- **lint**: 0 err · 0 warn（首次）
- **单测**: 247 passed（96% / 89% / 95% / 99% coverage）
- **E2E**: 38 passed（v0.4.0 BUG 猎手 · full-ui-flow · live-extension · selection-bubble · demo）
- **build**: MV3 全绿

### 📦 依赖

- 新增：`eslint@10` · `typescript-eslint@8` · `eslint-plugin-react-hooks` · `eslint-plugin-react-refresh`
- 删除：`package-lock.json` 僵尸文件（v0.3.x 遗留，Dependabot 6 alerts 自动关闭）

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
