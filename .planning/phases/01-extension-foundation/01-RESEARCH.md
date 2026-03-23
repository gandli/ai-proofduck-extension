# Phase 1: Extension Foundation - Research

**Researched:** 2026-03-23
**Domain:** Greenfield browser extension foundation for a local-first AI sidepanel assistant
**Confidence:** HIGH

## Summary

第 1 阶段不应该试图把所有 AI 能力一次做完，重点是把“扩展壳子、主界面、基础设置、最小验证链路”先搭稳。对这个项目来说，真正的风险不是写不出功能，而是在一开始没有把扩展上下文、状态边界和用户主流程定清楚，后面越做越重。

当前最合理的起步顺序是：

1. 先建 WXT + React + Tailwind 的扩展骨架
2. 先把侧边栏 UI 作为唯一主入口做出来
3. 设置和基础状态先跑通，再谈复杂引擎加载
4. 在 Phase 1 就把类型检查、单测、最小 smoke 基线立住

## Key Recommendations

### 1. 先把“扩展能打开且能交互”做成硬基线

- 需要至少有 `background`、`sidepanel`、基础 manifest、样式系统、组件结构。
- 用户一打开扩展，就要能看到五种模式、输入区、结果区和状态区域。

### 2. 设置能力优先于复杂 AI 能力

- 第 1 阶段只需要保证用户能看到并保存目标语言、主要引擎选择等基础设置。
- 不必在这一步把所有引擎的真实加载细节做完。

### 3. 先固定状态和契约

- 至少要明确模式枚举、设置对象、基础状态和消息边界。
- 否则第 2 阶段做网页内输入，第 3/4 阶段接引擎时会反复返工。

### 4. 把质量基线立在 Phase 1

- `npm run compile`
- `npm run test`
- 最小 smoke 清单

如果这一步不立住，后续阶段每次改动都会失去判断依据。

## Risks To Avoid

- 过早接入所有引擎，导致壳子和主流程反而不稳定
- 让 `App.tsx` 一开始就承担太多执行逻辑
- 没有形成最小目录结构和组件分层
- 没有验证扩展真的能打开并展示基础 UI

## Suggested Deliverables

- 最小可运行扩展脚手架
- 侧边栏主界面壳子
- 基础设置面板
- 模式与设置契约
- 编译与测试基线

## Requirement Support

- CORE-01
- CORE-02
- CORE-03
- INPT-03
- SET-01
- SET-03
- QUAL-01
- QUAL-03
