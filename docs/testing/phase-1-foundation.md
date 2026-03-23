# Phase 1 Foundation Verification

## 自动验证

- `bun run compile` 通过
- `bun run test` 通过，5 个测试全部通过
- `bun run build` 通过

## 人工 smoke

1. 安装并打开扩展，确认侧边栏能正常打开。
2. 确认五种模式都可见并可切换。
3. 在侧边栏输入文本，确认输入区和结果区都可见。
4. 修改设置后重新打开侧边栏，确认设置恢复。

## 说明

这份文档是第 1 阶段的最小基线，只验证扩展骨架、主界面和基础设置，不验证复杂 AI 能力。
如果需要用 `npm`，可以直接执行同名脚本：`npm run compile`、`npm run test`、`npm run build`。
