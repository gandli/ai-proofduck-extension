# Roadmap: AI proofduck Refactor

## Overview

这次路线图的目标不是重做产品，而是在不破坏已上线能力的前提下，把这套浏览器扩展重构成一套更容易理解、验证和继续开发的结构。路线会先冻结契约和现状，再拆侧边栏，再统一 AI 运行时，最后处理内容脚本、后台桥接和最终回归验证。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Baseline and Contracts** - 固化现有行为、共享契约和基础文档
- [ ] **Phase 2: Sidepanel Decomposition** - 拆解侧边栏 UI 与状态流程
- [ ] **Phase 3: Runtime Pipeline Unification** - 统一 AI 执行与 worker 生命周期边界
- [ ] **Phase 4: Content and Regression Hardening** - 整理内容脚本与后台桥接，并完成回归收口

## Phase Details

### Phase 1: Baseline and Contracts
**Goal**: 先把现有系统讲清楚、测清楚、对齐清楚，为后续重构提供不变的边界。
**Depends on**: Nothing (first phase)
**Requirements**: [ARCH-01, ARCH-02, ARCH-03, QUAL-02, QUAL-03]
**Success Criteria** (what must be TRUE):
  1. 维护者可以通过规划文档和代码结构快速理解当前系统的上下文分工。
  2. 模式、设置、消息和关键存储键有统一定义或整理后的单一来源。
  3. README、构建输出说明和测试入口与仓库真实行为一致。
  4. 编译、单测和关键手测基线可以作为后续阶段的回归标准。
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — 盘点现有运行时消息、存储键、入口职责和关键用户流程
- [ ] 01-02-PLAN.md — 提炼共享契约与基础文档，清理明显的说明漂移
- [ ] 01-03-PLAN.md — 跑通编译与现有测试基线，记录后续阶段必须保留的行为

### Phase 2: Sidepanel Decomposition
**Goal**: 把侧边栏从“巨型入口组件”拆成更清楚的组合结构，同时保持界面行为不变。
**Depends on**: Phase 1
**Requirements**: [UI-01, UI-02]
**Success Criteria** (what must be TRUE):
  1. `App.tsx` 主要负责页面组合和高层流程，不再直接承载大量混杂副作用。
  2. 设置恢复、抓取页面内容、执行动作和结果呈现可以独立测试。
  3. 侧边栏核心交互在重构后与当前用户体验保持一致。
**Plans**: 3 plans

Plans:
- [ ] 02-01: 拆出侧边栏的状态恢复与动作编排层
- [ ] 02-02: 把设置、结果展示和执行入口整理成更稳定的模块边界
- [ ] 02-03: 更新并补强侧边栏相关单测

### Phase 3: Runtime Pipeline Unification
**Goal**: 收拢 Chrome AI、本地模型、在线 API 和翻译兜底的执行路径，让加载、进度和错误处理规则一致。
**Depends on**: Phase 2
**Requirements**: [ENGN-01, ENGN-02, ENGN-03]
**Success Criteria** (what must be TRUE):
  1. 不同 AI 路径通过统一的执行边界暴露能力，而不是分散决策。
  2. worker 的加载、复用、重置和进度反馈在各入口触发下表现一致。
  3. UI 代码不再直接理解底层模型缓存和镜像回退细节。
**Plans**: 3 plans

Plans:
- [ ] 03-01: 设计并接入统一的运行时路由层
- [ ] 03-02: 整理 offscreen 与 worker 的生命周期和消息桥接
- [ ] 03-03: 为运行时关键路径补上可验证的测试支撑

### Phase 4: Content and Regression Hardening
**Goal**: 收尾内容脚本与后台桥接的结构问题，并完成全链路回归与文档收口。
**Depends on**: Phase 3
**Requirements**: [UI-03, QUAL-01]
**Success Criteria** (what must be TRUE):
  1. 内容脚本的翻译弹窗和交互流程比当前更清楚、更容易验证。
  2. 后台到 offscreen 再到页面或侧边栏的桥接路径稳定可回归。
  3. 关键单测、端测和必要的手动验证可以证明主要用户流程没有回归。
**Plans**: 3 plans

Plans:
- [ ] 04-01: 拆解内容脚本弹窗和事件处理逻辑
- [ ] 04-02: 加固后台桥接与跨上下文回调路径
- [ ] 04-03: 完成最终回归验证并收口文档

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Baseline and Contracts | 0/3 | Not started | - |
| 2. Sidepanel Decomposition | 0/3 | Not started | - |
| 3. Runtime Pipeline Unification | 0/3 | Not started | - |
| 4. Content and Regression Hardening | 0/3 | Not started | - |
