# AI proofduck Refactor

## What This Is

AI proofduck 是一个已经上线的浏览器侧边栏写作助手扩展，提供翻译、摘要、润色、校对和扩写能力，并优先走本地或浏览器内建 AI 路线。这个项目不是重写一个新产品，而是在保留现有体验和能力的前提下，把当前代码整理成更容易理解、测试和继续迭代的结构。

## Core Value

在不破坏现有用户流程的前提下，把这个扩展重构成一个清晰、稳健、可持续演进的代码库。

## Requirements

### Validated

- ✓ 用户可以在侧边栏中对输入文本执行翻译、摘要、润色、校对和扩写
- ✓ 用户可以抓取当前页面内容并在侧边栏继续处理
- ✓ 用户可以在网页内通过悬浮入口触发快捷翻译
- ✓ 用户可以在本地模型、Chrome 内建 AI、在线 API 与翻译兜底之间切换处理路径
- ✓ 用户设置会被持久化，且 API Key 会尽量避免长期落盘
- ✓ 项目已经具备单元测试与端到端测试基础设施

### Active

- [ ] 把扩展的上下文通信、状态存储和 AI 路由整理成清晰的共享契约
- [ ] 把侧边栏 UI 从巨型组件拆成更容易维护和测试的结构
- [ ] 把本地模型、Chrome AI、在线 API 与翻译兜底的执行路径收敛成一致的运行时边界
- [ ] 把内容脚本和后台脚本中的大块流程拆解成更清楚的模块
- [ ] 让文档、构建脚本、测试覆盖和实际代码行为重新对齐

### Out of Scope

- 新增新的 AI 模式或产品能力 — 这次工作的目标是重构，不是功能扩张
- 引入新的后端服务或账号系统 — 当前产品是纯扩展形态，先保持边界稳定
- 大规模视觉改版或品牌重做 — 先保证结构可维护，再讨论界面升级
- 改变用户现有设置字段和已存数据语义 — 避免给已安装用户带来迁移风险

## Context

- 这是一个 brownfield 项目，主代码集中在 `entrypoints/`，没有传统 `src/` 目录。
- 目前最重的复杂度来自多上下文协作：`background.ts`、`content.ts`、`offscreen/main.ts`、`sidepanel/App.tsx`、`sidepanel/worker.ts` 共同完成一次处理流程。
- 侧边栏里同时存在 UI 组合、流程控制、状态恢复、浏览器消息、错误处理和加载策略，`App.tsx` 与部分 hook 已经承担过多职责。
- AI 路由逻辑分散在 `useWorker.ts` 与 `worker.ts` 等位置，本地模型、Chrome AI、在线 API、翻译兜底的边界还不够统一。
- 文档存在至少一个已确认的漂移点：README 写的是 `.output/`，而实际构建输出目录已经是 `dist/`。
- 测试基础不差，但当前重构更需要把“哪些行为必须不回归”整理成明确的保护线。

## Constraints

- **Compatibility**: 必须继续工作在现有扩展形态和当前 WXT/React/TypeScript 栈上 — 这是最低风险路径
- **Behavioral Safety**: 不能破坏 5 个现有模式、全文抓取、快捷翻译、设置持久化等已存在能力 — 这些已经是产品承诺
- **Storage**: 需要兼容当前浏览器存储键和基本语义 — 避免升级后出现设置失效
- **Privacy**: 本地优先与 API Key 尽量不长期落盘的策略必须保留 — 这是产品定位的一部分
- **Verification**: 每个重构阶段都要靠编译、单测和关键手测证明没有回归 — 不能靠主观判断

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 按 brownfield 重构而不是从零重写 | 现有功能已经具备完整产品轮廓，重写风险高且验证成本大 | — Pending |
| 保留 WXT + React + TypeScript 作为基础栈 | 现有工具链、测试与扩展权限配置都围绕这套栈建立 | — Pending |
| 以粗粒度 4 阶段路线图启动本次工作 | 先解决结构主干问题，再逐段落地，避免计划过碎 | — Pending |
| 先补代码库地图与需求追踪，再开始改代码 | 对 brownfield 项目直接动手容易误伤已有行为 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-23 after initialization*
