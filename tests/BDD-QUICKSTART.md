# 校对鸭 BDD 极简执行卡

这份卡片只保留最直接的执行方法，适合回归时照着跑。

## 先跑这 3 步

1. `bun run build`
2. `bun run test`
3. `bun run test:bdd`

如果只想先看主链路有没有活着：

1. `bun run smoke`

## 怎么算通过

`bun run test:bdd` 结束时，终端出现：

`BDD OK`

## 这套回归主要在看什么

当前自动化已经覆盖 `30` 条真实浏览器场景，重点看这 6 类：

1. 页内 `🐣 / 🐥` 悬停翻译、点击送入侧边栏、卡片关闭
2. 侧边栏 `导入选区`、`抓取正文`、五种处理模式
3. 设置切换、引擎切换、自动回退
4. 浏览器 AI 路线
5. 本地模型 `GPU / 兼容模式` 路线
6. 失败提示是否清楚，且不会冲掉原内容

## 失败时先怎么判断

如果 `BDD` 失败，先看失败场景属于哪一类：

1. 和 `🐣`、悬停卡片、选区同步有关
先看 [content.ts](/Users/user/Documents/ai-proofduck-extension/entrypoints/content.ts)

2. 和侧边栏输入、结果、设置、按钮有关
先看 [App.tsx](/Users/user/Documents/ai-proofduck-extension/entrypoints/sidepanel/App.tsx)

3. 和实际引擎、自动回退、本地模型、浏览器 AI 有关
先看 [executeProcessing.ts](/Users/user/Documents/ai-proofduck-extension/lib/processing/executeProcessing.ts)
再看 [background.ts](/Users/user/Documents/ai-proofduck-extension/entrypoints/background.ts)
和 [main.ts](/Users/user/Documents/ai-proofduck-extension/entrypoints/offscreen/main.ts)

## 要看完整说明时

1. 更完整的执行说明： [BDD-RUNBOOK.md](/Users/user/Documents/ai-proofduck-extension/tests/BDD-RUNBOOK.md)
2. 全量场景清单： [BDD-CHECKLIST.md](/Users/user/Documents/ai-proofduck-extension/tests/BDD-CHECKLIST.md)
