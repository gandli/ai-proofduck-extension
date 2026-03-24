# 端到端场景测试

这里放的是基于 Chrome 扩展真实运行方式的场景回归测试。

目前提供两类命令：

- `bun run smoke`
  快速确认关键主链路是否可用。
- `bun run test:bdd`
  用 BDD 风格把主要用户场景完整走一遍。

推荐的回归顺序：

1. `bun run build`
2. `bun run test`
3. `bun run test:bdd`

当前 `test:bdd` 已覆盖 `30` 条真实浏览器场景，包含：

1. 页内翻译入口
2. 侧边栏基础操作
3. 引擎切换与回退
4. 浏览器 AI 分支
5. 本地模型 GPU / 兼容模式分支
6. 失败反馈与恢复

更完整的说明，见：

- [BDD-MANUAL-CHECKLIST.md](/Users/user/Documents/ai-proofduck-extension/tests/BDD-MANUAL-CHECKLIST.md)
- [BDD-QUICKSTART.md](/Users/user/Documents/ai-proofduck-extension/tests/BDD-QUICKSTART.md)
- [BDD-RUNBOOK.md](/Users/user/Documents/ai-proofduck-extension/tests/BDD-RUNBOOK.md)
- [BDD-CHECKLIST.md](/Users/user/Documents/ai-proofduck-extension/tests/BDD-CHECKLIST.md)
