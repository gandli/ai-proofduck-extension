# 校对鸭

## What This Is

校对鸭是一个面向网页阅读与写作场景的 AI 侧边栏助手。用户在浏览网页时，可以直接对选中文本或整页内容进行翻译、摘要、校对、润色和扩写，并在浏览器内完成从阅读到修改的闭环。产品使用 WXT + React + TypeScript + Tailwind 开发，强调本地优先、随用随开、尽量不打断当前浏览流程。

## Core Value

用户在网页里看到一段内容时，能立刻用低打断的方式完成理解、改写或翻译，而且优先走本地能力。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 构建一个可打开的浏览器侧边栏，支持五种文本处理模式与统一结果区。
- [ ] 支持网页选中文本和整页内容两种输入方式，并把处理结果稳定返回给用户。
- [ ] 建立本地优先的多引擎执行路径，至少覆盖浏览器内置 AI、本地模型、在线 API 和翻译兜底服务。

### Out of Scope

- 用户账号、云端同步、团队协作能力 — 不是 v1 的核心价值，会显著放大复杂度。
- 独立桌面端或移动端应用 — 当前目标是浏览器扩展内完成主要场景。
- 通用聊天机器人或开放式对话产品 — 项目聚焦网页阅读与写作处理，不做泛聊天。
- 复杂的后端服务和运营后台 — v1 优先验证扩展端体验和核心处理链路。

## Context

- 产品定位是“网页里的即时文本处理工具”，不是独立 AI 平台。
- 主要场景来自网页阅读、写作、翻译与内容改写。
- 核心交互应尽量短路径完成，避免让用户频繁复制粘贴或离开当前页面。
- 引擎策略采用本地优先，再补充在线能力和翻译兜底，以兼顾隐私、体验和可用性。
- 技术上明确使用 WXT、React、TypeScript、Tailwind，项目按现代浏览器扩展工程方式组织。

## Constraints

- **Tech stack**: WXT + React + TypeScript + Tailwind — 已明确指定，避免在初始化阶段分散到其他框架。
- **Product focus**: 浏览器扩展优先 — 核心价值发生在网页阅读和写作流程里。
- **Architecture**: 本地优先，多引擎并存 — 需要为浏览器内置 AI、本地模型、在线 API、翻译兜底保留清晰边界。
- **UX**: 低打断 — 交互必须尽量短，优先侧边栏与网页内就地触发。
- **Scope**: 先做可用闭环，再谈平台化 — v1 不引入账号体系、云同步和后台系统。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 以浏览器扩展为唯一产品形态启动 | 目标场景天然发生在网页阅读与写作中 | — Pending |
| 采用 WXT + React + TypeScript + Tailwind | 工程栈已明确，适合现代扩展开发 | — Pending |
| 采用本地优先的多引擎策略 | 兼顾隐私、响应速度与可用性 | — Pending |
| v1 聚焦文本处理闭环，不做账号和云平台 | 先验证核心价值，避免范围失控 | — Pending |

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
