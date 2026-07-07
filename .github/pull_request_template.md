<!--
v0.5.6 P3-B（审计 v5）：PR template
开 PR 时 GitHub 会自动填这份骨架。骨架来自 CONTRIBUTING.md 的 PR 检查清单。

删除本注释块后再提交。
-->

## 💡 变更类型

- [ ] `feat` 新功能
- [ ] `fix` bug 修复
- [ ] `perf` 性能优化
- [ ] `refactor` 重构（无行为变化）
- [ ] `docs` 文档
- [ ] `test` 测试补齐
- [ ] `chore` 构建/依赖/工具链
- [ ] `security` 安全相关（**优先合并**）

## 🎯 变更目的

<!-- 一句话说清"为什么改" + 关联 issue -->

Closes #

## 🔧 变更内容

<!-- 逐项列出关键改动，让 review 者不用读 diff 也能知道你干了啥 -->

-
-
-

## ✅ PR 检查清单

**代码质量**（本地跑通再 push）：

- [ ] `bun run compile` · 0 TypeScript error
- [ ] `bun run lint` · 0 ESLint warning（`--max-warnings=0`）
- [ ] `bunx vitest run` · 全部测试通过
- [ ] `bun audit` · 0 漏洞
- [ ] 覆盖率不下降（`bunx vitest run --coverage` 后手动核对）

**代码规范**：

- [ ] commit message 遵循 Conventional Commits（`feat:` / `fix:` / `chore:` ...）
- [ ] 新增功能 → 有 unit test 或 E2E test 覆盖
- [ ] 修 bug → 有回归测试防止再犯（"如果这个测试通过但 fix 不在，就说明 fix 无效"）
- [ ] 敏感信息（apiKey / Bearer / token）走 `sanitizeSecrets` / `logSanitizedError` 出口
- [ ] 新增 fetch → 复用 `createFetchAbortHandle`（不裸手写 `AbortController`）

**文档与协作**：

- [ ] CHANGELOG.md `[Unreleased]` 已更新
- [ ] 涉及用户可见变更 → README/README.zh-CN 同步
- [ ] 破坏性变更（breaking change）→ 单独在 PR 描述里 `## Breaking Changes` 章节说明

## 🧪 如何验证

<!-- 让 review 者能在 3 分钟内本地跑通你的改动 -->

```bash
git checkout <branch>
bun install
bunx vitest run tests/unit/<相关>
# 或 E2E：
bunx playwright test tests/e2e/<相关>.spec.ts
```

## 📸 截图 / 录屏（如涉及 UI）

<!-- 拖入 png/gif/mp4；options / popup / sidepanel / SelectionBubble 的视觉变化都需要 -->

## 🔒 安全 checklist（如涉及网络请求或密钥）

- [ ] error body 出口走 `sanitizeSecrets` + 1000 char 缓冲区 + 字面量 apiKey 兜底
- [ ] 无 `console.log(err)` / `console.error(err)`（走 `logSanitizedError` 或先 `formatErrorMessage`）
- [ ] host_permissions 未扩大到不必要域名
- [ ] 无 `<all_urls>` 硬编码（用户主动 `optional_host_permissions`）
