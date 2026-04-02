# AI ProofDuck 第一阶段实现计划

## 概述

**项目**: AI ProofDuck 浏览器扩展
**阶段**: 第一阶段 - 核心翻译功能
**目标**: 实现开箱即用的 AI 辅助翻译功能
**基于设计**: `docs/superpowers/specs/2026-04-03-proofduck-phase1-design.md`

---

## M1: 项目初始化、测试框架搭建

### 任务 1.1: 配置开发环境
- **步骤**:
  1. 确认 package.json 中依赖完整（WXT, React 19, TypeScript, TailwindCSS, Zustand）
  2. 配置 wxt.config.ts 基础设置
  3. 配置 tsconfig.json 严格模式
  4. 配置 path aliases（@/ → src/, @entry/ → entrypoints/）
- **文件**: `package.json`, `wxt.config.ts`, `tsconfig.json`
- **依赖**: 无

### 任务 1.2: 搭建测试框架
- **步骤**:
  1. 配置 Vitest（单元测试）
  2. 配置 Playwright（E2E 测试）
  3. 创建测试目录结构
  4. 编写示例测试用例
- **文件**: `vitest.config.ts`, `playwright.config.ts`, `tests/`
- **依赖**: 1.1

### 任务 1.3: 初始化 Git Hooks
- **步骤**:
  1. 配置 pre-commit hook（lint 检查）
  2. 配置 commit-msg hook（提交信息规范）
- **文件**: `.husky/`, `commitlint.config.js`
- **依赖**: 1.1

### 任务 1.4: 创建项目目录结构
- **步骤**:
  1. 创建 src/ 子目录（engines/, core/, hooks/, stores/, types/, components/）
  2. 创建 entrypoints/popup/components/
  3. 创建 public/_locales/ 目录结构
- **文件**: 目录骨架
- **依赖**: 1.1

---

## M2: 引擎适配器架构（至少支持谷歌翻译）

### 任务 2.1: 定义引擎接口
- **步骤**:
  1. 定义 TranslationEngine 接口
  2. 定义 TranslationResult 类型
  3. 定义 EngineState 类型
  4. 定义 ServiceConfig 类型
- **文件**: `src/types/index.ts`, `src/engines/interface.ts`
- **依赖**: M1

### 任务 2.2: 实现 EngineManager
- **步骤**:
  1. 创建 EngineManager 类
  2. 实现引擎注册与发现机制
  3. 实现优先级调度逻辑
  4. 实现自动降级逻辑
  5. 实现引擎状态通知
- **文件**: `src/core/EngineManager.ts`
- **依赖**: 2.1

### 任务 2.3: 实现谷歌翻译适配器
- **步骤**:
  1. 创建 GoogleTranslateAdapter 类
  2. 实现 checkAvailability() 方法
  3. 实现 translate() 方法（调用谷歌翻译 API）
  4. 实现流式输出支持（可选）
  5. 处理 CORS 代理问题
- **文件**: `src/engines/google.ts`
- **依赖**: 2.1

### 任务 2.4: 创建引擎状态管理 Store
- **步骤**:
  1. 创建 engineStore（Zustand）
  2. 管理当前引擎、备选引擎列表
  3. 持久化用户引擎偏好
- **文件**: `src/stores/engine.ts`
- **依赖**: 2.2

### 任务 2.5: 编写引擎适配器单元测试
- **步骤**:
  1. 编写 GoogleTranslateAdapter 测试
  2. 编写 EngineManager 测试
  3. Mock 外部 API 调用
- **文件**: `tests/unit/engines/*.test.ts`
- **依赖**: 2.3, 1.2

---

## M3: 侧边栏 UI 实现

### 任务 3.1: 创建基础 Popup 布局
- **步骤**:
  1. 实现 Header 组件（Logo + 设置按钮）
  2. 实现 Tab Bar 组件（翻译/校对/润色/扩写）
  3. 实现基础布局框架
- **文件**: `entrypoints/popup/components/Header.tsx`, `TabBar.tsx`
- **依赖**: M2

### 任务 3.2: 实现翻译 Tab UI
- **步骤**:
  1. 实现语言选择器（源语言自动检测 + 目标语言）
  2. 实现原文输入框（textarea）
  3. 实现结果展示框
  4. 实现底部按钮（开始翻译）
  5. 实现字符数显示
- **文件**: `entrypoints/popup/components/TranslationTab.tsx`
- **依赖**: 3.1

### 任务 3.3: 实现校对/润色/扩写 Tab UI
- **步骤**:
  1. 复用 TranslationTab 结构
  2. 调整语言选择器（校对/润色/扩写不需要源语言选择）
  3. 调整底部按钮文案和图标
- **文件**: `entrypoints/popup/components/ProofreadingTab.tsx`, `ExpansionTab.tsx`
- **依赖**: 3.2

### 任务 3.4: 实现浮层组件（FloatingCard）
- **步骤**:
  1. 创建 FloatingCard 组件
  2. 实现箭头指向功能
  3. 实现位置自适应（避免超出视口）
  4. 实现最大宽高限制（400px/300px）
- **文件**: `src/components/FloatingCard.tsx`
- **依赖**: 3.1

### 任务 3.5: 实现设置面板
- **步骤**:
  1. 创建 SettingsPanel 组件
  2. 实现通用设置（自动翻译、双语对照、默认目标语言）
  3. 实现引擎管理 UI（分组展开、勾选启用）
- **文件**: `entrypoints/popup/components/SettingsPanel.tsx`
- **依赖**: 2.4

### 任务 3.6: 实现 Popup E2E 测试
- **步骤**:
  1. 编写 Tab 切换测试
  2. 编写翻译流程测试
  3. 编写设置页面测试
- **文件**: `tests/e2e/popup/*.spec.ts`
- **依赖**: 3.5, 1.2

---

## M4: 全文翻译功能

### 任务 4.1: 实现页面内容提取
- **步骤**:
  1. 创建 content script 工具函数
  2. 实现 DOM 文本节点遍历
  3. 过滤 script/style 等非内容节点
  4. 实现页面语言检测
- **文件**: `src/utils/pageContentExtractor.ts`
- **依赖**: M3

### 任务 4.2: 实现右键菜单
- **步骤**:
  1. 在 background.ts 中注册 contextMenus
  2. 实现菜单项：翻译页面、翻译/校对/润色/扩写选中文字
  3. 实现菜单项点击处理逻辑
- **文件**: `entrypoints/background.ts`, `src/hooks/useContextMenus.ts`
- **依赖**: 4.1

### 任务 4.3: 实现划词悬浮卡
- **步骤**:
  1. 在 content.ts 中监听 mouseup 事件
  2. 检测选中文本
  3. 在选区附近显示悬浮卡
  4. 实现翻译/校对/复制按钮
- **文件**: `entrypoints/content.ts`, `src/components/SelectionCard.tsx`
- **依赖**: 4.2

### 任务 4.4: 实现翻译结果浮层
- **步骤**:
  1. 创建 TranslationResultLayer 组件
  2. 实现流式输出显示
  3. 实现复制、朗读、打开侧边栏按钮
  4. 实现引擎名称和响应时间显示
  5. 实现关闭按钮
- **文件**: `src/components/TranslationResultLayer.tsx`
- **依赖**: 4.3, 3.4

### 任务 4.5: 实现全文翻译流程
- **步骤**:
  1. 遍历页面文本节点
  2. 调用翻译引擎
  3. 在原文下方插入译文（双语对照模式）
  4. 处理大页面分批翻译
- **文件**: `src/utils/fullPageTranslator.ts`
- **依赖**: 4.1, 2.3

### 任务 4.6: 编写全文翻译 E2E 测试
- **步骤**:
  1. 编写右键菜单测试
  2. 编写划词翻译测试
  3. 编写全文翻译测试
- **文件**: `tests/e2e/fullpage/*.spec.ts`
- **依赖**: 4.5, 1.2

---

## M5: Chrome AI / 本地模型支持

### 任务 5.1: 实现 Chrome AI 适配器
- **步骤**:
  1. 创建 ChromeAIAdapter 类
  2. 实现 checkAvailability()（检测 Gemini Nano）
  3. 实现 translate() 方法
  4. 实现流式输出
- **文件**: `src/engines/chrome-ai.ts`
- **依赖**: M4

### 任务 5.2: 实现 WebGPU 适配器
- **步骤**:
  1. 创建 WebGPUAdapter 类
  2. 实现 web-llm 集成
  3. 实现模型加载管理
  4. 实现 translate() 和流式输出
- **文件**: `src/engines/webgpu.ts`
- **依赖**: M4

### 任务 5.3: 实现 WASM 适配器
- **步骤**:
  1. 创建 WASMAdapter 类
  2. 集成 NLLB-200 或 Firefox Translations
  3. 实现 translate() 方法
- **文件**: `src/engines/wasm.ts`
- **依赖**: M4

### 任务 5.4: 实现模型后台下载管理
- **步骤**:
  1. 创建 ModelLoader 类
  2. 实现下载进度跟踪
  3. 实现下载完成后通知
  4. 在设置页显示加载状态
- **文件**: `src/core/ModelLoader.ts`
- **依赖**: 5.2, 5.3

### 任务 5.5: 编写本地模型适配器单元测试
- **步骤**:
  1. Mock Chrome AI API
  2. Mock web-llm
  3. 测试适配器逻辑
- **文件**: `tests/unit/engines/*.test.ts`
- **依赖**: 5.1, 5.2, 5.3

---

## M6: LLM API 集成

### 任务 6.1: 实现 OpenAI 格式适配器
- **步骤**:
  1. 创建 OpenAIAdapter 类
  2. 实现 OpenAI 兼容接口
  3. 支持自定义 API Endpoint（如 OpenRouter、Cloudflare AI）
  4. 实现流式输出（Server-Sent Events）
- **文件**: `src/engines/openai.ts`
- **依赖**: M5

### 任务 6.2: 实现 Claude 适配器
- **步骤**:
  1. 创建 ClaudeAdapter 类
  2. 实现 Anthropic API 格式
  3. 实现流式输出
- **文件**: `src/engines/claude.ts`
- **依赖**: 6.1

### 任务 6.3: 实现 API Key 管理
- **步骤**:
  1. 在设置页添加 API Key 输入
  2. 安全存储到 chrome.storage
  3. 实现加密存储（可选）
- **文件**: `src/stores/settings.ts`, `entrypoints/popup/components/SettingsPanel.tsx`
- **依赖**: 6.1, 6.2

### 任务 6.4: 扩展 EngineManager 支持更多引擎
- **步骤**:
  1. 添加 DeepSeek 适配器
  2. 添加通义千问适配器
  3. 添加 Gemini 适配器
- **文件**: `src/engines/deepseek.ts`, `src/engines/qwen.ts`, `src/engines/gemini.ts`
- **依赖**: 6.1

### 任务 6.5: 编写 LLM 适配器单元测试
- **步骤**:
  1. Mock HTTP 请求
  2. 测试流式输出解析
  3. 测试错误处理
- **文件**: `tests/unit/engines/*.test.ts`
- **依赖**: 6.1, 6.2, 6.3

---

## M7: 测试完善（单测 + E2E）

### 任务 7.1: 完善单元测试覆盖
- **步骤**:
  1. 统计单元测试覆盖率
  2. 补充缺失的测试用例
  3. 重点覆盖核心逻辑（EngineManager、引擎适配器）
- **文件**: `tests/unit/**/*.test.ts`
- **依赖**: M6

### 任务 7.2: 编写 BDD 特性文件
- **步骤**:
  1. 编写翻译功能特性文件
  2. 编写校对功能特性文件
  3. 编写引擎切换特性文件
- **文件**: `tests/bdd/features/*.feature`
- **依赖**: M6

### 任务 7.3: 完善 E2E 测试
- **步骤**:
  1. 补充边界情况测试
  2. 编写跨浏览器测试（Firefox）
  3. 编写性能测试
- **文件**: `tests/e2e/**/*.spec.ts`
- **依赖**: M6

### 任务 7.4: 配置 CI/CD 测试流程
- **步骤**:
  1. 配置 GitHub Actions
  2. 配置自动化测试
  3. 配置测试结果报告
- **文件**: `.github/workflows/*.yml`
- **依赖**: 7.1, 7.2, 7.3

---

## 任务依赖关系图

```
M1 ──────────────────────────────────────────────────────────────
├── 1.1 ─┬── 1.2 ─ 1.3 ─ 1.4                                   │
└────────┘                                                     │
                                                              ▼
M2 ──────────────────────────────────────────────────────────────
├── 2.1 ─ 2.2 ─ 2.4 ─ 2.5                                      │
├── 2.3 ────────────────────────────────────────────────────┤   │
└──────────────────────────────────────────────────────────────┘   │
                                                                  ▼
M3 ──────────────────────────────────────────────────────────────
├── 3.1 ─ 3.2 ─ 3.3 ─ 3.4 ─ 3.5 ─ 3.6                          │
└──────────────────────────────────────────────────────────────┘   │
                                                                  ▼
M4 ──────────────────────────────────────────────────────────────
├── 4.1 ─ 4.2 ─ 4.3 ─ 4.4 ─ 4.5 ─ 4.6                          │
└──────────────────────────────────────────────────────────────┘   │
                                                                  ▼
M5 ──────────────────────────────────────────────────────────────
├── 5.1 ─ 5.4 ─ 5.5                                            │
├── 5.2 ─ 5.4 ─ 5.5                                            │
├── 5.3 ─ 5.4 ─ 5.5                                            │
└──────────────────────────────────────────────────────────────┘   │
                                                                  ▼
M6 ──────────────────────────────────────────────────────────────
├── 6.1 ─ 6.3 ─ 6.4 ─ 6.5                                      │
├── 6.2 ─ 6.3 ─ 6.4 ─ 6.5                                      │
└──────────────────────────────────────────────────────────────┘   │
                                                                  ▼
M7 ──────────────────────────────────────────────────────────────
├── 7.1 ─ 7.2 ─ 7.3 ─ 7.4                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 关键文件清单

| 类别 | 文件路径 |
|------|----------|
| **配置** | `package.json`, `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` |
| **入口** | `entrypoints/background.ts`, `entrypoints/content.ts`, `entrypoints/popup/App.tsx` |
| **类型** | `src/types/index.ts` |
| **引擎** | `src/engines/interface.ts`, `src/engines/google.ts`, `src/engines/chrome-ai.ts`, `src/engines/webgpu.ts`, `src/engines/wasm.ts`, `src/engines/openai.ts`, `src/engines/claude.ts` |
| **核心** | `src/core/EngineManager.ts`, `src/core/ModelLoader.ts` |
| **状态** | `src/stores/settings.ts`, `src/stores/engine.ts` |
| **组件** | `src/components/FloatingCard.tsx`, `src/components/TranslationResultLayer.tsx`, `src/components/SelectionCard.tsx` |
| **Popup** | `entrypoints/popup/components/Header.tsx`, `entrypoints/popup/components/TabBar.tsx`, `entrypoints/popup/components/TranslationTab.tsx`, `entrypoints/popup/components/SettingsPanel.tsx` |
| **工具** | `src/utils/pageContentExtractor.ts`, `src/utils/fullPageTranslator.ts` |
| **测试** | `tests/unit/**/*.test.ts`, `tests/e2e/**/*.spec.ts`, `tests/bdd/features/*.feature` |
| **i18n** | `public/_locales/en/messages.json`, `public/_locales/zh/messages.json`, `public/_locales/ja/messages.json` |

---

## 里程碑检查清单

### M1 完成标准
- [ ] 开发服务器正常启动
- [ ] Vitest 测试可运行
- [ ] Playwright E2E 测试可运行
- [ ] 项目目录结构完整

### M2 完成标准
- [ ] EngineManager 正确调度引擎
- [ ] 谷歌翻译适配器正常工作
- [ ] 引擎状态正确显示
- [ ] 单元测试通过

### M3 完成标准
- [ ] 4 个 Tab 可切换
- [ ] 语言选择器正常工作
- [ ] 翻译结果正确显示
- [ ] 设置面板可配置

### M4 完成标准
- [ ] 右键菜单显示正确
- [ ] 划词悬浮卡正常显示
- [ ] 翻译结果浮层正常显示
- [ ] 全文翻译正常工作

### M5 完成标准
- [ ] Chrome AI 适配器正常工作
- [ ] WebGPU 适配器正常工作
- [ ] 模型后台下载正常
- [ ] 引擎自动降级正常

### M6 完成标准
- [ ] OpenAI 适配器正常工作
- [ ] Claude 适配器正常工作
- [ ] API Key 安全存储
- [ ] 流式输出正常

### M7 完成标准
- [ ] 单元测试覆盖率达到 80%+
- [ ] BDD 特性文件完整
- [ ] E2E 测试覆盖核心流程
- [ ] CI/CD 测试流程正常
