# Phase 1: Baseline and Contracts - Research

**Researched:** 2026-03-23
**Domain:** Browser extension baseline mapping, shared contracts, and regression boundaries for a WXT + React + TypeScript codebase
**Confidence:** HIGH

<user_constraints>
## User Constraints

No `*-CONTEXT.md` file exists for this phase yet.

### Locked Decisions
- Brownfield refactor, not a rewrite.
- Keep existing extension shape, WXT/React/TypeScript stack, and current user-facing behavior.
- Do not break the five existing modes, quick translate, full-page fetch, or settings persistence.
- Keep storage semantics backward compatible, especially current keys and API key handling.

### Claude's Discretion
- How to document current context boundaries.
- How to extract shared contracts without changing runtime behavior.
- How to define the minimum trustworthy regression baseline for later phases.

### Deferred Ideas (OUT OF SCOPE)
- New AI modes or product features.
- New backend/account system.
- Large visual redesign.
- Changing existing settings meaning or clearing user data.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | 维护者可以从代码结构和文档中快速看清 background、content、sidepanel、offscreen、worker 各自负责什么 | 明确五个上下文的职责边界、消息走向、存储键、入口文件和文档修正点 |
| ARCH-02 | 模式、设置、存储键和运行时消息协议由共享契约统一定义并被各上下文复用 | 以 `entrypoints/sidepanel/types/index.ts` 为单一契约源，扩展到 background/content/offscreen |
| ARCH-03 | 重构后现有五种模式、快捷翻译、全文抓取和设置持久化行为继续可用 | 识别必须冻结的行为保护线和当前真实依赖链 |
| QUAL-02 | 构建、编译和测试命令对当前仓库状态是准确且可执行的 | 校验 `package.json` 脚本、指出当前依赖缺失导致的未跑通现状 |
| QUAL-03 | 代码地图、项目说明和 README 能反映实际架构与输出目录 | 核对 README、WXT 输出目录、测试入口和实际目录结构的漂移点 |
</phase_requirements>

## Summary

Phase 1 不应该先改逻辑，而应该先把“现在系统到底怎么工作”固化成单一描述。当前仓库已经有一部分共享定义，特别是 [`entrypoints/sidepanel/types/index.ts`](../../../entrypoints/sidepanel/types/index.ts) 里已经整理了模式、设置、worker 协议和浏览器消息类型，但这份定义还没有成为所有上下文共同依赖的单一事实来源。`background.ts` 仍然自己维护一份 `MODES`，`content.ts` 自己处理一套错误码和消息分支，`offscreen/main.ts` 也在桥接时隐式约定了状态同步字段。这说明 Phase 1 的核心不是“发明新架构”，而是把已经存在但分散的契约收拢并文档化。

第二个关键结论是：当前测试和文档都给人一种“好像已经有基线”的错觉，但基线并不够硬。Vitest 配置和大量测试文件确实存在，但很多测试是把规则再写一遍，并没有真正卡住多上下文通信。Playwright 的 e2e 目前测的是仓库根目录 `index.html` 落地页，不是扩展交互本身。README 还写着产物输出到 `.output/`，而 WXT 实际配置是 `dist/`。这意味着 Phase 1 计划里必须专门安排“基线校准”任务，不能把已有测试数量当成已有回归保护。

**Primary recommendation:** 先做“现状冻结”而不是“结构美化”：用共享契约文件 + 代码地图 + 漂移修正文档 + 最小可信验证记录，明确后续阶段绝不能改坏的边界。

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | Repo `^0.20.17`; latest verified `0.20.20` (2026-03-17) | 浏览器扩展构建、入口打包、MV3 开发工作流 | 当前仓库就是按 WXT 的多入口模型组织，继续沿用风险最低 |
| React | Repo `^19.2.4`; latest verified `19.2.4` (2026-01-26) | sidepanel UI | 现有侧边栏已经建立在 React 组件和 hook 上 |
| TypeScript | Repo `^5.9.3`; latest verified `5.9.3` (2025-09-30) | 类型契约与编译检查 | Phase 1 的共享契约收拢本质上依赖 TypeScript 类型边界 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | Repo `^4.0.18`; latest verified `4.1.0` (2026-03-12) | 单元测试/契约测试 | 用来冻结纯逻辑、协议映射、默认值与状态恢复规则 |
| Playwright | Repo `^1.48.0`; latest verified `1.58.2` (2026-02-06) | 浏览器级验证 | Phase 1 只适合用于记录现状和指出当前覆盖偏差，不建议在本阶段升级 |
| `@mlc-ai/web-llm` | Repo `^0.2.74` | 本地模型运行时 | 当前离线/本地路径依赖它，但 Phase 1 只需要标清边界，不需要动它 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 继续使用现有 WXT 栈 | 换 Vite + 手写 MV3 配置 | 对本阶段没有收益，只会扩大验证范围 |
| 直接升级测试框架版本 | 先保留当前版本 | Phase 1 目标是校准基线，不是工具升级 |
| 立刻补真实端到端扩展测试 | 先记录现状和缺口 | 更符合 Phase 1 先冻结边界、后加深验证的节奏 |

**Installation:**
```bash
npm install
```

**Version verification:** Verified with `npm view [package] version time --json` on 2026-03-23.

## Architecture Patterns

### Recommended Project Structure
```text
entrypoints/
├── background.ts              # 用户手势入口、side panel/offscreen 生命周期、消息转发
├── content.ts                 # 页面选择、悬浮翻译 UI、页面内容抓取响应
├── offscreen/
│   └── main.ts                # worker 宿主与 background 桥接
└── sidepanel/
    ├── App.tsx                # UI 组合与高层动作编排
    ├── hooks/
    │   ├── useSettings.ts     # 设置恢复、状态恢复、持久化
    │   └── useWorker.ts       # UI 到运行时的消息分发与结果接收
    ├── types/
    │   └── index.ts           # Phase 1 的共享契约单一来源
    └── worker.ts              # 本地/在线/Chrome AI 执行
```

### Pattern 1: Contract-First Extraction
**What:** 先把模式、设置、浏览器消息、worker 消息、存储键写成共享契约，再让各上下文引用它。  
**When to use:** Phase 1 的所有整理工作都应该先收敛契约，再改文档或测试。  
**Example:**
```typescript
export type ModeKey = 'summarize' | 'correct' | 'proofread' | 'translate' | 'expand';

export interface WorkerGenerateMessage {
  type: 'generate';
  text: string;
  mode: ModeKey;
  settings: Settings;
  requestId?: string;
}
```
Source: current repo pattern in `entrypoints/sidepanel/types/index.ts`

### Pattern 2: Context Boundary by Responsibility, Not by Framework
**What:** 以“谁负责什么”来切边界，而不是按文件大小拆。  
**When to use:** 规划代码地图、README 架构段落、Phase 2/3 的后续拆分前。  
**Example:**
```typescript
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
```
Source: https://developer.chrome.com/docs/extensions/reference/api/sidePanel

### Pattern 3: Preserve Storage Semantics During Extraction
**What:** 现有键名和语义先冻结，Phase 1 只集中定义，不改 meaning。  
**When to use:** 任何涉及 `selectedText`、`settings`、`engineStatus`、`menuIntentMode`、`fetchPageIntent`、`autoTriggerAt`、`lastProgress`、`activeTab` 的整理。  
**Example:**
```typescript
const res = await browser.storage.local.get([
  'selectedText',
  'settings',
  'activeTab',
  'engineStatus',
  'menuIntentMode',
  'fetchPageIntent',
  'lastProgress',
  'autoTriggerAt',
]);
```
Source: current repo pattern in `entrypoints/sidepanel/hooks/useSettings.ts`

### Pattern 4: Treat Chrome AI as an Intentional Special Path
**What:** Chrome Built-in AI 现在直接在 sidepanel 中运行，不走 offscreen worker。  
**When to use:** 规划共享契约时，要把它写成“显式例外”，不是误当成遗漏。  
**Example:**
```typescript
if (msg.type === 'generate' && msg.settings?.engine === 'chrome-ai') {
  runChromeAiGenerate(msg);
  return;
}
```
Source: current repo pattern in `entrypoints/sidepanel/hooks/useWorker.ts`

### Anti-Patterns to Avoid
- **先改行为再补契约:** 这会让 Phase 1 失去“冻结边界”的意义。
- **把 `background.ts` 的 `MODES` 和共享 `MODES` 继续并存:** 模式定义会继续漂移。
- **把 README 修成“看起来合理”而不是“和仓库一致”:** Phase 1 的目标是对齐真实现状。
- **把现有单测数量当成已建立回归保护:** 目前很多测试并没有穿过真实扩展边界。
- **在本阶段升级依赖版本:** 会把 baseline phase 变成 upgrade phase。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 跨上下文协议 | 每个入口各写一套 message shape | 共享 discriminated unions in `entrypoints/sidepanel/types/index.ts` | 现在已有基础，继续分叉只会让后续重构更危险 |
| 入口职责说明 | 靠维护者读大文件自己猜 | 明确的代码地图和 README 架构段落 | Phase 1 目标就是把职责边界说清楚 |
| 状态恢复规则 | 新的持久化语义 | 保留现有 storage keys 和 session/local 分工 | 已安装用户的兼容性比“更优雅”更重要 |
| 构建输出说明 | 手写想象中的目录 | 以 `wxt.config.ts` 的 `outDir: 'dist'` 为准 | 当前 README 已经因为这个点漂移 |
| “端到端”定义 | 把营销页自动化当扩展回归 | 单独标记为网站测试，扩展回归另立基线 | 否则会误判质量状况 |

**Key insight:** 这个阶段最该复用的不是外部库，而是仓库里已经存在的共享类型和现有行为。先把它们立成唯一来源，比继续发明新层更重要。

## Common Pitfalls

### Pitfall 1: 把已有 `types/index.ts` 误当成“只给 sidepanel 用”
**What goes wrong:** 继续在 `background.ts`、`content.ts`、`offscreen/main.ts` 各自硬编码消息和模式。  
**Why it happens:** 共享类型文件现在放在 `sidepanel/` 目录下，容易被误解成 sidepanel 私有文件。  
**How to avoid:** Phase 1 先把它定位成全局共享契约来源，必要时只做移动或重导出，不改语义。  
**Warning signs:** 同一 mode 列表、错误码或消息名在多个文件重复出现。

### Pitfall 2: 忽略 Chrome AI 是“旁路”
**What goes wrong:** 规划时假设所有生成都经过 background → offscreen → worker。  
**Why it happens:** 大部分路径确实如此，但 `chrome-ai` 在 `useWorker.ts` 里直接跑。  
**How to avoid:** 在代码地图和契约文档中明确标注“标准路径”和“Chrome AI 特例路径”。  
**Warning signs:** 计划里出现“统一所有生成都走 offscreen”这种表述。

### Pitfall 3: 误把逻辑影子测试当成行为回归
**What goes wrong:** 以为已有测试已经覆盖关键用户流程，后续改动时掉以轻心。  
**Why it happens:** 测试文件很多，但不少只是把条件分支重写一遍。  
**How to avoid:** Phase 1 先把“可信测试”和“描述性测试”分开记录。  
**Warning signs:** 测试不 import 真实模块、不触发真实消息监听、不经过真实状态恢复链。

### Pitfall 4: 忘记快捷翻译依赖的是“链路”不是“函数”
**What goes wrong:** 改一处消息或状态名后，快捷翻译悄悄失效。  
**Why it happens:** 这条链同时依赖 `selectedText`、`OPEN_SIDE_PANEL`、`WORKER_UPDATE`、`engineStatus` 和 popup 重试逻辑。  
**How to avoid:** 在 Phase 1 明确写出完整链路，作为后续重构的保护线。  
**Warning signs:** 只记录 `QUICK_TRANSLATE`，没记录 storage 和 popup 状态回流。

### Pitfall 5: 以为当前构建/测试命令已经“可执行”
**What goes wrong:** 规划后续阶段时直接把当前脚本当绿灯基线。  
**Why it happens:** `package.json` 脚本存在，但当前工作区未安装依赖，`tsc`/`vitest`/`playwright` 都无法启动。  
**How to avoid:** 在研究文档里明确区分“命令定义正确”与“当前环境已跑通”。  
**Warning signs:** `npm run compile`、`npm run test`、`npm run test:e2e` 报 `command not found`。

## Code Examples

Verified patterns from official or current authoritative sources:

### Side Panel Trigger Pattern
```typescript
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openSidePanel') {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
```
Source: https://developer.chrome.com/docs/extensions/reference/api/sidePanel

### Offscreen Singleton Pattern
```typescript
const existingContexts = await chrome.runtime.getContexts({
  contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
});

if (existingContexts.length === 0) {
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('/offscreen.html'),
    reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
    justification: 'Hosting background processing'
  });
}
```
Source: https://developer.chrome.com/docs/extensions/reference/api/offscreen

### Shared Contract Pattern
```typescript
export type WorkerOutboundMessage =
  | WorkerProgressMessage
  | WorkerReadyMessage
  | WorkerUpdateMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage;
```
Source: current repo pattern in `entrypoints/sidepanel/types/index.ts`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 靠大入口文件隐式表达架构 | 先立共享契约，再拆实现 | Current best practice for brownfield TS refactors | 更适合分阶段重构和防回归 |
| 文档描述产物目录 | 以构建配置为真源 | WXT current config model | README 必须跟 `wxt.config.ts` 对齐 |
| 测试数量代表安全 | 可信回归链路才代表安全 | Current testing discipline | Phase 1 必须先给测试分层 |
| 把所有运行时都视为同一路径 | 明确标准路径与旁路例外 | Current repo reality | Chrome AI 路径不能被误消除 |

**Deprecated/outdated:**
- README 中 “build 输出到 `.output/`” 的描述：已过时，当前实际配置是 `dist/`。
- 把 `tests/e2e` 当扩展行为回归主入口：对当前仓库不准确，这些测试主要覆盖根目录落地页。

## Open Questions

1. **Phase 1 是否只记录当前 Playwright 现状，还是顺手把扩展级 smoke baseline 一起补上？**
   - What we know: 当前 e2e 主要测 `index.html` 落地页，不测扩展。
   - What's unclear: 这是否在本项目语境下也算 `QUAL-02` 的一部分，还是放到后续验证阶段补。
   - Recommendation: Phase 1 至少要在文档里明确标注现状与缺口；如果时间允许，可补一个最小扩展 smoke，但不要扩大成完整 e2e 改造。

2. **共享契约文件是否要在本阶段移动出 `sidepanel/` 目录？**
   - What we know: 现在位置容易让人误以为它只服务 sidepanel。
   - What's unclear: 当前 import 改动成本是否值得在 baseline phase 承担。
   - Recommendation: Phase 1 可以先不移动，只先把它定义为“全局契约源”；移动位置可作为 Phase 1 的后半或 Phase 2 前置小步。

## Sources

### Primary (HIGH confidence)
- Current repo files:
  - [`entrypoints/background.ts`](../../../entrypoints/background.ts) - background responsibilities, context menu, side panel opening, offscreen creation
  - [`entrypoints/content.ts`](../../../entrypoints/content.ts) - quick translate popup, page-content responder, popup error flow
  - [`entrypoints/offscreen/main.ts`](../../../entrypoints/offscreen/main.ts) - offscreen worker hosting and bridge
  - [`entrypoints/sidepanel/App.tsx`](../../../entrypoints/sidepanel/App.tsx) - sidepanel orchestration
  - [`entrypoints/sidepanel/hooks/useSettings.ts`](../../../entrypoints/sidepanel/hooks/useSettings.ts) - settings persistence and storage recovery
  - [`entrypoints/sidepanel/hooks/useWorker.ts`](../../../entrypoints/sidepanel/hooks/useWorker.ts) - runtime routing and Chrome AI exception path
  - [`entrypoints/sidepanel/types/index.ts`](../../../entrypoints/sidepanel/types/index.ts) - shared type definitions
  - [`wxt.config.ts`](../../../wxt.config.ts) - real output directory and manifest config
  - [`README.md`](../../../README.md) - doc drift check
  - [`package.json`](../../../package.json) - script truth source
  - [`vitest.config.ts`](../../../vitest.config.ts) and [`playwright.config.ts`](../../../playwright.config.ts) - test framework setup
- Chrome Side Panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Chrome Offscreen API: https://developer.chrome.com/docs/extensions/reference/api/offscreen
- Chrome Storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- WXT API reference (background entrypoint/config model): https://wxt.dev/api/reference/wxt/interfaces/backgroundentrypointoptions

### Secondary (MEDIUM confidence)
- npm registry package metadata verified on 2026-03-23 via `npm view [package] version time --json`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified from repo `package.json` and npm registry metadata
- Architecture: HIGH - derived directly from current source files plus official Chrome extension API docs
- Pitfalls: HIGH - based on concrete repo findings, not generic advice

**Research date:** 2026-03-23
**Valid until:** 2026-04-22
