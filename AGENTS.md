# AGENTS.md

请始终用中文和用户交流。

## 沟通要求

- 先说结果，再说影响。
- 用直白语言解释，不要把回复写成代码评审或术语堆砌。
- 汇报前先完成工作并验证，优先交付可直接使用的结果。

## 工作要求

- 先定义完成标准，再开始动手。
- 这是一个 brownfield 浏览器扩展项目，默认优先保留现有行为，不轻易改核心逻辑。
- 做任何代码改动前，先看 `.planning/PROJECT.md`、`.planning/REQUIREMENTS.md`、`.planning/ROADMAP.md` 和 `.planning/STATE.md`。
- 优先遵循 GSD 流程：
  - 小改动用 `$gsd-quick`
  - 排查问题用 `$gsd-debug`
  - 执行已规划阶段用 `$gsd-execute-phase`
- 只有在用户明确要求绕过流程时，才直接跳过规划文档。

## 仓库上下文

- 这是一个基于 WXT、React、TypeScript 的浏览器扩展。
- 主代码位于 `entrypoints/`，不是传统 `src/` 结构。
- 关键入口：
  - `entrypoints/background.ts`
  - `entrypoints/content.ts`
  - `entrypoints/sidepanel/App.tsx`
  - `entrypoints/offscreen/main.ts`
  - `entrypoints/sidepanel/worker.ts`
- 当前重构目标是让上下文通信、侧边栏状态、AI 路由和文档测试边界更清楚，同时不破坏现有五种模式和快捷翻译能力。

## 验证要求

- 代码任务至少检查：
  - `npm run compile`
  - `npm run test`
- 涉及扩展交互或页面行为时，再补：
  - `npm run test:e2e`
- 如果某项验证没法跑，必须明确说明原因和影响。
