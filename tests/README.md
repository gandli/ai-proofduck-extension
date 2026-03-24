# 端到端场景测试

这里放的是基于扩展真实运行方式的场景回归测试。默认回归现在固定走单个 `Chromium` 实例，避免反复拉起多个浏览器窗口。

目前提供两类命令：

- `bun run smoke`
  快速确认关键主链路是否可用。
- `bun run test:bdd`
  用单个 `Chromium` 实例把主要用户场景完整走一遍。
- `bun run test:real`
  用单个有界面的 `Chromium` 实例跑一次真实本地 GPU 主链路。
- `bun run test:chrome-probe`
  只诊断这台机器上的 Chrome 正式版会不会拦自动化直开扩展页。

推荐的回归顺序：

1. `bun run build`
2. `bun run test`
3. `bun run test:bdd`

当前 `test:bdd` 已覆盖多条真实浏览器场景，包含：

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
