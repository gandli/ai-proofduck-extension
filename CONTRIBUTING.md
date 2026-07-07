# Contributing to 校对鸭

欢迎来搞事情 🙌 — 无论是修 bug、加引擎、优化 UI 还是补测试，都非常欢迎。

本文档描述我们的贡献流程、代码规范和 PR 检查清单。**新贡献者请先花 5 分钟读完再动手**，能省下反复修改的时间。

## 快速开始

### 环境准备

```bash
# 需要 Bun v1.2+（macOS: `brew install bun`）
git clone https://github.com/gandli/ai-proofduck-extension.git
cd ai-proofduck-extension
bun install --frozen-lockfile

# 开发模式（自动打开 Chrome 加载 unpacked 扩展）
bun run dev

# 生产构建
bun run build

# 打 zip 供 Chrome Web Store / Firefox 提交
bun run zip
```

### 运行测试

```bash
# 单元测试
bunx vitest run

# 单元测试 + coverage 报告
bunx vitest run --coverage

# E2E 测试（Playwright）
bunx playwright test

# 类型检查
bun run compile

# Lint（严格 0 warning）
bun run lint
```

## Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

| 前缀 | 场景 |
|---|---|
| `feat:` | 新功能（用户可感知） |
| `fix:` | Bug 修复 |
| `chore:` | 构建工具/依赖/工程杂项 |
| `docs:` | 只改文档 |
| `refactor:` | 不改行为的重构 |
| `test:` | 新增/修改测试 |
| `perf:` | 性能优化 |
| `ci:` | CI 配置变化 |

**示例**：

```
feat(engines): add moonshot v1-32k model preset
fix(sanitize): strip x-api-key header from error body (P1-A)
chore(deps): bump vitest 4.1.10 → 4.2.0
```

**中文 commit body 完全 OK** —— header 使用英文前缀，body 可以中文详述。

## Branch 命名

- `feat/xxx` — 新功能分支
- `fix/xxx` — bug 修复
- `chore/xxx` — 工程杂项
- `docs/xxx` — 文档
- `refactor/xxx` — 重构
- `test/xxx` — 只加测试

## PR 检查清单

提 PR 前请对照本表自查（省下等 CI 的时间）：

- [ ] `bun run compile` 通过（tsc 0 error）
- [ ] `bun run lint` 通过（eslint 0 warning，`--max-warnings=0` 严格模式）
- [ ] `bunx vitest run` 全绿（单元测试）
- [ ] `bunx playwright test` 全绿（E2E，若改了 UI 或 message-bus）
- [ ] 新增功能有对应单元测试（不必强求 E2E）
- [ ] 覆盖率**不下降**（vitest 阈值：stmts≥90 / branches≥85 / funcs≥85 / lines≥92）
- [ ] 修 bug 有 **回归测试**
- [ ] 面向用户的变更加进 `CHANGELOG.md`（放 `[Unreleased]` section 里）
- [ ] 面向用户的 UI 变更同步双语（`README.md` + `README.zh-CN.md`）

## Code Review 期待

- **Reviewer**：@gandli（Repository Owner）
- **Bot review**：Gemini Code Review 会在 PR 打开后 2-5 分钟评论。Gemini 有时会重复 review 已修改的代码（无状态）—— 若你已在 diff 里修完，可以简单回复 "已处理"（我们会核对）。
- **Codacy**：测试文件的复杂度警报可以豁免（`admin merge`），生产代码复杂度警报需要处理。
- **CodeRabbit**：偶尔登场做二次审阅。

### Merge 策略

- **默认**：Squash + Delete branch
- **例外**：单个作者的多 commit 有明确语义分层时 → Rebase merge（需仓库主人授意）

## 测试策略

我们采用 **TDD-friendly** 但**不强制 TDD**：

- **必写**：修 bug → 先写会失败的测试再修 → 保留作回归
- **推荐**：新功能 → 单元测试覆盖核心逻辑，E2E 覆盖用户 flow
- **允许豁免**：纯样式改动（tailwind class 调整）可以不写测试，但必须有截图或视频

### 测试目录结构

```
tests/
├── unit/                    # vitest 单元测试
│   ├── components/          # React 组件测试
│   ├── engines/             # 4 引擎测试
│   ├── core/                # message-bus / storage
│   └── utils/               # 工具函数
└── e2e/                     # Playwright E2E
    ├── fixtures/            # 复用的 fixture（extensionPath / launchOptions）
    └── *.spec.ts            # E2E 用例
```

## 项目架构简介

```
src/
├── background/       Service Worker · 生命周期 / badge / message router
├── core/             跨组件基础设施 · message-bus / engine manager / storage
├── engines/          翻译引擎（4 种）· chrome-ai / free-translate / openai-compat / webllm
├── components/       共享 React 组件
├── hooks/            useTranslate / useSelection
├── stores/           storage 派生 store
├── utils/            纯函数工具 · cache / sanitize / fetch-abort
└── i18n/             多语言字符串

entrypoints/          WXT 入口
├── sidepanel/        Side Panel 主界面
├── options/          设置页
└── popup/            工具栏 popup（当前简单，主要指向 sidepanel）
```

更详细的引擎 API 契约见 `src/engines/types.ts`。

## Skills / 内部约定

本项目使用了 Hermes Agent 的 skill 系统。相关 skill 的最新版可在 [Hermes docs](https://hermes-agent.nousresearch.com/docs) 找到：

- `wxt-chrome-extension` — WXT + Vitest + React TDD 工作流
- `github-pr-workflow` — feat → push → gh pr create → 等 bot → squash + delete-branch
- `pr-review-address` — Gemini/CodeRabbit review 收敛策略

如果你在贡献时发现某个 skill 步骤过时/缺失，请在 PR 里附一个 patch 建议。

## 沟通

- **中文 / English**：均欢迎（作者中文是母语，issue 用中文更快）
- **紧急安全问题**：走 [SECURITY.md](./SECURITY.md) 的私下渠道，不要在公开 issue 讨论

---

**最后更新**：2026-07-07 · v0.5.6 审计 v4
