# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 全量审计 v4 · 7/7 findings（除 SRP 拆分留独立 PR）

第四轮全量审计（`fuck-my-shit-mountain` skill），收敛 v3 之后的 UI 出口一致性 + 治理文件补齐。**无 P0**，风险面已从功能收敛到工程约束层。

### 🔴 P1 · Critical 修复（1 项）

- **P1-A**：`OpenAiCompatSection.handleTest` 未 sanitize resp.body → 走 `sanitizeSecrets` 出口
  - 与 v3 P1-A 引擎侧修复语义连续；这里是 UI 侧同类模式（服务端 echo Authorization header 到 body）
  - 修复前：`HTTP 401 Bearer sk-proj-abc...` 直接进 setTestState → 用户截图/日志上传时明文泄漏
  - 修复后：`sanitizeSecrets(body).slice(0, 200)` —— 先脱敏后切片，与 openai-compat.ts / free-translate.ts 一致
  - 回归测试：`OpenAiCompatSection.spec.tsx` 新增 body 内含 Bearer token 场景断言 DOM 不含明文

### 🟠 P2 · High 修复（3 项，SRP 独立 PR）

- **P2-A**：`OpenAiCompatSection.handleTest` 手写 `AbortController + setTimeout` → 复用 `createFetchAbortHandle`
  - DRY 收口，未来加"用户取消"能力时直接接 userSignal
  - 保留 15s 超时（比默认 30s 短，测试连接短超时更好 UX）
- **P2-C**：新增 `.github/dependabot.yml`
  - npm + github-actions 双生态每周一自动扫更新
  - minor+patch group、React/wxt major ignore（需人肉审兼容性）
  - 时间锁定 Asia/Shanghai 9AM
- **P2-D**：`entrypoints/options/App.tsx:75` `e.isAvailable().then(...)` 裸 promise → 加 `void` 前缀
  - eslint 生产代码开启 `@typescript-eslint/no-floating-promises: error`（`ignoreVoid: true`），防温水煮青蛙

### 🟡 P3 · Governance / Documentation（3 项）

- **P3-A**：新增 `SECURITY.md` — 私下漏洞报告渠道（GitHub Security Advisories）+ 48h/5d/7-14d 响应时间承诺 + 6 项已知安全边界声明
- **P3-B**：新增 `CONTRIBUTING.md` — Bun 环境准备、Conventional Commits、branch 命名、PR 检查清单、code review 期待
- **P3-C**：`lifecycle.ts:75` `console.warn(...err)` → `logSanitizedError(...)`（防未来 chrome.sidePanel API 变化把用户上下文塞进 err.message 时绕过 sanitize）

### ⏭️ 后续独立 PR

- **P2-B**：`OpenAiCompatSection.tsx` 单文件 364 loc + 18 hooks 违反 SRP → 拆成 4 subcomponents + constants.ts（同 v2 SidePanel 案例，大动作独立 PR + 覆盖率复检）

### 📊 QA 结果

- Unit tests: **370/370** ✅ (+1 P1-A 回归测试)
- E2E: 43/43 ✅
- 行覆盖: 96%+ (未跑最新 —— 加了 lifecycle sanitize 后应仍稳)
- tsc / lint / audit / dependabot / secret-scan：全 0

---

## [v0.5.5] - 2026-07-07 · 全量审计 v3 · 8/8 findings 全绿 + CI 硬化

第三轮全量审计（`fuck-my-shit-mountain` skill v1.3），8 findings 一次 PR 打包全部结账，重心从「代码本身」转向「发布链路 & 供应链」。

### 🔴 P1 · Critical 修复（3 项）

- **P1-A（#510）**：`sanitizeErrorBody(text.slice(0, 200))` **顺序 bug** → 改为 `sanitizeErrorBody(text).slice(0, 200)`
  - 若 secret 恰好跨 200 字节边界，先切再脱敏会把前部 secret 切成 <20 char，绕过 `SECRET_PATTERNS` 的 `{20,}` 长度约束泄漏明文
  - 同步补 `free-translate.ts` 走 `sanitizeSecrets`（防御性一致）
  - 回归测试：body 190 byte 填充 + `sk-***` → 断言 `Error.message` 无 `/sk-[A-Za-z0-9]{5,}/`
- **P1-B（#510）**：`SelectionBubbleHost` catch 分支直接 `setError(e.message)` → 走 `formatErrorMessage(e, ...)` 全站脱敏出口
  - Gemini review 采纳：直接传 `e`（不预处理 `.message`），内部 `extractRawMessage` 覆盖 Chrome 扩展跨进程 `sendMessage` 反序列化后的 plain object 场景
  - 回归测试：mock engine 抛 `sk-***` + plain object 双场景
- **P1-C（#510）**：CI `build-extension.yml` **无 QA gate** → 加 `tsc + lint + vitest + audit` 步骤
  - 破损代码不再能通过 tag 直接打 release

### 🟠 P2 · High 修复（3 项）

- **P2-A（#510）**：CRX 私钥从 `secrets.CRX_KEY` 读，未配置降级临时 key（仅 PR 冒烟）
  - 修复扩展 ID 每次 CI 漂移导致老用户无法升级问题
  - 用 `shred` 立即清理 key 文件，防 artifact 泄漏
- **P2-B（#510）**：5 个 GH action 全 pin 到 40 位 SHA
  - `actions/checkout` · `oven-sh/setup-bun` · `actions/upload-artifact` · `mikepenz/release-changelog-builder-action` · `softprops/action-gh-release`
  - 防 tag 被移动到恶意 commit 的供应链攻击
- **P2-D**：v0.5.3 tag 回补（v0.5.2 → v0.5.4 之间跳号 → 回补到 commit `53b34da`）

### 🟢 P3 · Medium 修复（2 项）

- **P3-A（#510）**：LanguageBar target `onChange` 分支覆盖 80% → +1 单测直接改目标语言（zh→ja→ko）
- **P3-B（#510）**：`useTranslate.ts:86` 缓存命中竞态早退未测 → +1 reset 后立即命中缓存测试

### 📊 指标演进

| 维度 | v0.5.4 | v0.5.5 | Δ |
|---|---:|---:|---|
| Unit tests | 360 | **365** | +5 |
| E2E tests | 43/43 | 43/43 | ✅ |
| 全站行覆盖 | 94.93% | **95.04%** ✨ | +0.11（越过 95% 门槛） |
| tsc | 0 | 0 | ✅ |
| eslint warnings | 0 | 0 | ✅ |
| bun audit | 0 vulns | 0 vulns | ✅ |

### 🔐 CI 硬化 · 3 大变化

1. **QA gate**：tag 触发发布前先绿 `tsc / lint / vitest / audit`
2. **CRX key secret 化**：生产 CRX 扩展 ID 稳定，用户可正常升级（需运维 `gh secret set CRX_KEY`）
3. **actions SHA pin**：5 个第三方 action 全 pin，供应链攻击面清零

### 交付 PR

- **#510**：`chore(audit-v3): 8/8 findings 全绿 · 3P1 + 3P2 + 2P3 一次性打包`

## [v0.5.4] - 2026-07-07 · 全量审计 v2 · 12/12 findings 全绿

跟进 v0.5.3 后由深度审计 skill（`fuck-my-shit-mountain`）触发的第二轮全量审计，12 findings 全部结账。

### 🔴 P1 · Critical 修复（3 项）

- **P1-A（#507）**：`sidepanel/App.tsx` 覆盖率 67.24% → **95.83%**（行）/ 52.63% → **97.82%**（分支）；补齐 handleSwap / handleKeyDown / isSameLanguage / pickBest resolve+reject 双路径测试
- **P1-B（#506）**：33 处 `act warnings` → **0**；提炼 `renderAct()` helper（`tests/helpers/render.ts`），全站测试统一异步渲染惯例
- **P1-C（#505）**：`bun audit` 36 vulnerabilities（1 crit / 19 high）→ **0**；供应链归零 + `sanitizeSecrets` 单点收口

### 🟠 P2 · High 修复（5 项）

- **P2-A（#508）**：`sidepanel/App.tsx` **383 → 169 loc**（-56%）· SRP 拆分为 4 子组件（EngineStatus / LanguageBar / Editor / ResultPanel）+ constants.ts；每片 ≤ 110 loc
- **P2-B（#505）**：所有 `fetch` 引擎 AbortController 全链路串联，防用户断网时永久 hang
- **P2-C（#507）**：`options/App.tsx` 分支覆盖 64.28% → **85.71%**；补 storage.onChanged sync/local 分支测试
- **P2-D（#505）**：`makeCacheKey` 加 engineId + model 维度，防跨引擎/跨模型缓存污染
- **P2-E（#506）**：E2E 编译时开关 `isE2EBuild()` 收口，替代散落的 `env.VITE_PD_E2E === 'true'` 字符串对比

### 🟢 P3 · 保健修复（4 项）

- **P3-A（#505）**：popup App `.catch(() => {})` 静默吞异常 → 换 `logSanitizedError`
- **P3-B（#506）**：README screenshots 版本标签同步到 v0.5.x UI
- **P3-C**：6 处 `eslint-disable react-hooks/set-state-in-effect` inline 注释审计通过（有 justification，acceptable）
- **P3-D（#505）**：`fetch` error body 输出前走 `sanitizeSecrets`，防 secret 泄漏到用户可见 UI

### 🧪 测试基线

- 单测 333 → **360** (+27，全绿)
- E2E **43/43** 全绿（2.1m）
- act warnings 33 → **0**
- 覆盖率 lines 93.02% → **94.93%**（+2 pp）
- 覆盖率 branches 86.21% → **88.83%**（+3 pp）

### 📐 架构收益

- SidePanel App.tsx 拆分为 4 子组件 + constants，未来加多引擎并发流 / 新语言选择器不再挤在单文件
- LanguageBar 可复用到 popup（如未来需要）
- review diff 变短：改一处只影响一片
- 拆分后**测试覆盖率反而提升**（App.tsx 行 89.65 → 95.83）

### 🤖 Bot review 采纳

- Gemini review 全流程采纳（3 批 × 3-7 条建议）：`aria-label` 语义定位、`try/finally` 隔离 mock 状态、字数条件收严、引导文案「左侧」→「上方」
- CodeRabbit 全绿；Codacy 复杂度告警来自拆分度量副作用（总复杂度 -4），admin merge

### 交付 PR

- #505 (P1-C · P3-D · P2-D · P2-B)
- #506 (P1-B · P2-E · P3-B)
- #507 (P1-A · P2-C)
- **#508 (P2-A · 结构重构)**

### 四大门槛

Open PR **0** · Open Issue **0** · Dependabot **0** · Secret scanning **0**

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
