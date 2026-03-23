# 校对鸭多引擎与活力橙主题 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让校对鸭按“Chrome 内置 AI -> 本地 WebGPU/WASM -> 在线 API -> 翻译兜底”的优先级真实运行，并把侧边栏统一升级成活力橙主题。

**Architecture:** 在侧边栏里新增一个统一调度层，专门负责选择可用引擎和处理回退；Chrome 内置 AI、本地 `web-llm`、在线 API、免费翻译分别拆成独立模块。界面只消费统一状态，不再自己拼接复杂判断，同时补齐真实烟雾测试和基础单测。

**Tech Stack:** WXT, React 19, TypeScript, Tailwind CSS, Vitest, Playwright, `@mlc-ai/web-llm`

---

## 文件结构

**Create:**
- `entrypoints/sidepanel/lib/engine-orchestrator.ts`
- `entrypoints/sidepanel/lib/engine-orchestrator.test.ts`
- `entrypoints/sidepanel/lib/engines/chrome-engine.ts`
- `entrypoints/sidepanel/lib/engines/local-webllm-engine.ts`
- `entrypoints/sidepanel/lib/engines/online-engine.ts`
- `entrypoints/sidepanel/lib/engines/translation-fallback-engine.ts`
- `entrypoints/sidepanel/worker.ts`

**Modify:**
- `package.json`
- `entrypoints/shared/contracts.ts`
- `entrypoints/sidepanel/App.tsx`
- `entrypoints/sidepanel/globals.css`
- `entrypoints/sidepanel/components/SettingsPanel.tsx`
- `entrypoints/sidepanel/hooks/useSettings.ts`
- `entrypoints/sidepanel/lib/engineStatus.ts`
- `entrypoints/sidepanel/lib/executeProcessing.ts`
- `entrypoints/sidepanel/App.test.tsx`
- `entrypoints/sidepanel/lib/engineStatus.test.ts`
- `entrypoints/sidepanel/lib/executeProcessing.test.ts`
- `scripts/smoke-extension.mjs`
- `README.md`

**Test:**
- `entrypoints/sidepanel/lib/engine-orchestrator.test.ts`
- `entrypoints/sidepanel/lib/engineStatus.test.ts`
- `entrypoints/sidepanel/lib/executeProcessing.test.ts`
- `entrypoints/sidepanel/App.test.tsx`

## Chunk 1: 数据结构与调度骨架

### Task 1: 扩充共享设置和状态契约

**Files:**
- Modify: `entrypoints/shared/contracts.ts`
- Modify: `entrypoints/sidepanel/hooks/useSettings.ts`
- Test: `entrypoints/sidepanel/hooks/useSettings.test.ts`

- [ ] **Step 1: 先写设置恢复相关失败用例**

在 `useSettings.test.ts` 增加断言，覆盖这些字段：
- 引擎策略：`auto | chrome-ai | local | online`
- 本地模型偏好：模型名、是否允许 WASM 回退
- 翻译兜底开关

- [ ] **Step 2: 运行单测确认当前失败**

Run: `bun run test -- entrypoints/sidepanel/hooks/useSettings.test.ts`
Expected: 新增字段缺失或断言失败。

- [ ] **Step 3: 扩展共享契约**

在 `contracts.ts` 新增：
- `EnginePreference`
- 本地模型配置
- 运行时状态结构
- 更明确的默认设置

- [ ] **Step 4: 更新设置读写逻辑**

让 `useSettings.ts` 能读取、合并、保存新增字段。

- [ ] **Step 5: 重新运行设置测试**

Run: `bun run test -- entrypoints/sidepanel/hooks/useSettings.test.ts`
Expected: PASS

### Task 2: 新建统一调度层

**Files:**
- Create: `entrypoints/sidepanel/lib/engine-orchestrator.ts`
- Create: `entrypoints/sidepanel/lib/engine-orchestrator.test.ts`

- [ ] **Step 1: 先写调度优先级失败用例**

覆盖这些情况：
- 自动模式下优先 Chrome 内置 AI
- Chrome 不可用时切到本地模型
- 本地不可用时切到在线 API
- 翻译模式最后还能切到翻译兜底
- 非翻译模式没有兜底时应明确失败

- [ ] **Step 2: 运行新测试确认失败**

Run: `bun run test -- entrypoints/sidepanel/lib/engine-orchestrator.test.ts`
Expected: FAIL，因为文件还不存在。

- [ ] **Step 3: 写最小调度实现**

提供统一入口，例如：
- 输入：当前模式、用户设置、环境能力
- 输出：本次尝试顺序、最终选中的引擎、是否需要回退说明

- [ ] **Step 4: 重新运行调度测试**

Run: `bun run test -- entrypoints/sidepanel/lib/engine-orchestrator.test.ts`
Expected: PASS

## Chunk 2: 各引擎独立落地

### Task 3: Chrome 内置 AI 适配

**Files:**
- Create: `entrypoints/sidepanel/lib/engines/chrome-engine.ts`
- Modify: `entrypoints/sidepanel/lib/engineStatus.ts`
- Test: `entrypoints/sidepanel/lib/engineStatus.test.ts`

- [ ] **Step 1: 先写状态检测失败用例**

覆盖：
- 当前环境有内置 AI 能力
- 当前环境没有能力
- 显示“准备中 / 不支持 / 可用”文案

- [ ] **Step 2: 运行测试确认失败**

Run: `bun run test -- entrypoints/sidepanel/lib/engineStatus.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 Chrome 内置 AI 检测和调用封装**

在 `chrome-engine.ts` 封装：
- 可用性检测
- 会话准备
- 文本处理

- [ ] **Step 4: 更新状态映射**

在 `engineStatus.ts` 把 Chrome 内置 AI 作为真正的第一优先说明来源。

- [ ] **Step 5: 重新运行状态测试**

Run: `bun run test -- entrypoints/sidepanel/lib/engineStatus.test.ts`
Expected: PASS

### Task 4: 本地 `web-llm` 适配

**Files:**
- Modify: `package.json`
- Create: `entrypoints/sidepanel/lib/engines/local-webllm-engine.ts`
- Create: `entrypoints/sidepanel/worker.ts`
- Modify: `entrypoints/sidepanel/lib/engineStatus.ts`
- Test: `entrypoints/sidepanel/lib/engineStatus.test.ts`

- [ ] **Step 1: 增加 `web-llm` 依赖**

在 `package.json` 加入 `@mlc-ai/web-llm`。

- [ ] **Step 2: 安装依赖**

Run: `bun install`
Expected: lockfile 更新，安装成功。

- [ ] **Step 3: 先写本地能力判断失败用例**

覆盖：
- WebGPU 可用
- 只有 WASM 回退
- 本地完全不可用

- [ ] **Step 4: 运行测试确认失败**

Run: `bun run test -- entrypoints/sidepanel/lib/engineStatus.test.ts`
Expected: FAIL

- [ ] **Step 5: 实现本地引擎封装**

在 `local-webllm-engine.ts` 做这些事：
- 检测 WebGPU
- 决定 WebGPU 还是 WASM
- 对外暴露模型加载与推理接口

- [ ] **Step 6: 实现 worker 通信**

在 `worker.ts` 承接模型加载和推理，返回：
- 当前阶段
- 进度
- 结果
- 错误

- [ ] **Step 7: 重新运行状态测试**

Run: `bun run test -- entrypoints/sidepanel/lib/engineStatus.test.ts`
Expected: PASS

### Task 5: 在线 API 与翻译兜底模块化

**Files:**
- Create: `entrypoints/sidepanel/lib/engines/online-engine.ts`
- Create: `entrypoints/sidepanel/lib/engines/translation-fallback-engine.ts`
- Modify: `entrypoints/sidepanel/lib/executeProcessing.ts`
- Test: `entrypoints/sidepanel/lib/executeProcessing.test.ts`

- [ ] **Step 1: 先写在线与兜底失败用例**

覆盖：
- 在线 API 成功返回
- 在线 API 失败后翻译模式进入兜底
- 非翻译模式失败时明确报错

- [ ] **Step 2: 运行测试确认失败**

Run: `bun run test -- entrypoints/sidepanel/lib/executeProcessing.test.ts`
Expected: FAIL

- [ ] **Step 3: 拆出在线 API 模块**

把当前在线调用从 `executeProcessing.ts` 拆到 `online-engine.ts`。

- [ ] **Step 4: 实现翻译兜底模块**

封装第三方翻译调用和统一返回格式。

- [ ] **Step 5: 重写执行入口**

让 `executeProcessing.ts` 只负责调用调度层与各引擎模块，不再自己写一堆条件判断。

- [ ] **Step 6: 重新运行执行测试**

Run: `bun run test -- entrypoints/sidepanel/lib/executeProcessing.test.ts`
Expected: PASS

## Chunk 3: 侧边栏接线与活力橙主题

### Task 6: 接通统一调度层到侧边栏界面

**Files:**
- Modify: `entrypoints/sidepanel/App.tsx`
- Modify: `entrypoints/sidepanel/components/SettingsPanel.tsx`
- Test: `entrypoints/sidepanel/App.test.tsx`

- [ ] **Step 1: 先写界面失败用例**

覆盖：
- 自动模式显示真实使用引擎
- 本地加载中显示进度
- 自动回退时显示原因
- 翻译兜底时显示对应提示

- [ ] **Step 2: 运行界面测试确认失败**

Run: `bun run test -- entrypoints/sidepanel/App.test.tsx`
Expected: FAIL

- [ ] **Step 3: 接入调度结果**

让 `App.tsx` 消费统一返回：
- 当前实际引擎
- 说明文案
- 加载状态
- 结果正文

- [ ] **Step 4: 升级设置面板**

在 `SettingsPanel.tsx` 增加：
- 自动优先模式
- 手动首选引擎
- 本地模型选项
- 翻译兜底开关

- [ ] **Step 5: 重新运行界面测试**

Run: `bun run test -- entrypoints/sidepanel/App.test.tsx`
Expected: PASS

### Task 7: 升级成活力橙主题

**Files:**
- Modify: `entrypoints/sidepanel/globals.css`
- Modify: `entrypoints/sidepanel/App.tsx`
- Modify: `entrypoints/sidepanel/components/SettingsPanel.tsx`

- [ ] **Step 1: 先定义主题变量**

在 `globals.css` 增加：
- 主品牌橙 `#FF5A11`
- 浅橙背景
- 卡片白
- 强调文字色
- 焦点与选中态颜色

- [ ] **Step 2: 更新主界面和设置面板样式**

统一按钮、标签、输入框、卡片和状态提示的颜色和层次。

- [ ] **Step 3: 本地打开界面做一次人工检查**

Run: `bun run build`
Then: 用真实扩展页面检查主按钮、模式切换、设置面板、结果区是否和 logo 风格一致。

## Chunk 4: 验证与文档

### Task 8: 更新烟雾测试覆盖真实优先级链路

**Files:**
- Modify: `scripts/smoke-extension.mjs`

- [ ] **Step 1: 增加新的烟雾测试检查点**

覆盖：
- 默认自动优先模式
- Chrome 不可用时切本地或在线
- 翻译模式能进入兜底
- 设置项变更后能生效

- [ ] **Step 2: 运行烟雾测试**

Run: `bun run smoke`
Expected: 输出 `SMOKE OK`

### Task 9: 全量验证并更新说明

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README**

写清：
- 引擎优先级
- 本地模型说明
- 在线 API 配置
- 烟雾测试命令

- [ ] **Step 2: 跑完整验证**

Run:
- `bun run test`
- `bun run compile`
- `bun run build`
- `bun run smoke`

Expected:
- 全部通过

- [ ] **Step 3: 整理最终交付说明**

确认用户能直接理解：
- 现在默认如何工作
- 什么时候会自动回退
- 需要配置什么

