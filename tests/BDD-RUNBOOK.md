# 校对鸭 BDD 回归说明

这份说明是给人看的执行手册，不是代码设计文档。

如果你只想拿一张最短执行卡，先看：

[BDD-QUICKSTART.md](/Users/user/Documents/ai-proofduck-extension/tests/BDD-QUICKSTART.md)

如果你要发给测试同学直接打勾，先看：

[BDD-MANUAL-CHECKLIST.md](/Users/user/Documents/ai-proofduck-extension/tests/BDD-MANUAL-CHECKLIST.md)

目标很简单：

1. 让人一眼知道这套浏览器回归在测什么
2. 让人知道该怎么跑
3. 让人知道失败时先看哪里
4. 让人知道默认回归为什么固定走单个 `Chromium` 实例

## 先跑什么

推荐按这个顺序：

1. `bun run build`
   先生成最新扩展产物，保证浏览器测试跑的是最新代码。

2. `bun run test`
   先看单元测试有没有明显回归。

3. `bun run test:bdd`
   再跑完整浏览器场景回归。

4. `bun run test:real`
   需要真人感知那条本地 GPU 主链路时，再跑这条单实例真实浏览器验证。

5. `bun run test:chrome-probe`
   只在你想确认“这台机器的 Chrome 正式版会不会拦扩展页”时才跑。

如果只想快速看主链路：

1. `bun run smoke`

## 当前覆盖范围

当前 `bun run test:bdd` 已经覆盖多条真实浏览器场景，可以分成 6 组来看。

## 为什么默认不用 Chrome 正式版

这台机器上，Playwright 直开 `chrome-extension://...` 时，Chrome 正式版会间歇性返回 `ERR_BLOCKED_BY_CLIENT`。  
同一份扩展、同一套脚本，`Chromium` 是正常的。

所以现在的约定是：

1. 日常回归默认走 `Chromium`
2. `Chrome` 只保留一个单独探针命令来判断“当前会不会被拦”
3. 不再让 `test:bdd` 先试 Chrome 再退 Chromium，避免多开窗口和不稳定

### 1. 页内翻译入口

这组主要看 `🐣 / 🐥` 和悬停翻译卡片：

1. 选区悬停翻译会同步到侧边栏，而且不会重复请求
2. 翻译卡片会在关闭、点击空白后消失；点击 `Copy` 时保持打开
3. 点击 `🐣` 会把选区送进侧边栏，并复用已有结果
4. 同一段文字重复悬停不会重复翻译
5. 切换到新的选区后，图标会从 `🐥` 恢复成 `🐣`
6. 清空选区后，页内触发图标会隐藏
7. 页面重新加载后，悬停翻译仍然可用

### 2. 侧边栏基础操作

这组主要看侧边栏本身的基本交互：

1. `导入选区` 能带入当前选区
2. `抓取全文` 能带入整页全文
3. 五种模式都能产生真实结果
4. 清空原文和清空结果互不影响
5. 设置在重新打开后仍然保留
6. 侧边栏关闭后再打开，仍能恢复刚才的选区并完成翻译
7. 设置页会直接显示官方模型推荐和官方数量

### 3. 失败反馈

这组确保失败时不是静默坏掉：

1. 在线接口没配置时，会给出明确提示
2. 可用引擎都关闭时，会明确失败
3. `抓取全文` 失败时，会提示“当前页面没有可抓取的全文”，并保留原文
4. `导入选区` 失败时，会提示“当前页面没有可导入的选区”，并保留原文
5. 无选区时导入选区，不会误覆盖现有内容

### 4. 引擎切换与回退

这组确保结果真的是按设置来的：

1. 切换首选策略时，设置页只显示对应区块
2. 设置切换后，不会误用旧翻译结果
3. 策略切换后，实际引擎会跟着变化
4. 在线接口失败后，会自动回退到翻译服务
5. 结果标题会显示当前实际引擎
6. 页内卡片和侧边栏会显示同一条实际引擎

### 5. 浏览器 AI

这组锁住 Gemini Nano 这条路：

1. 明确选择浏览器 AI 时，会显示浏览器 AI 结果与来源
2. 明确选择浏览器 AI，但目标语言不支持时，会明确失败，而且不会偷偷切到别的路线

### 6. 本地模型

这组锁住本地模型相关路线：

1. 明确选择本地模型且可用 GPU 时，会显示本地 GPU 结果与来源
2. 明确选择本地模型且只有兼容模式时，会显示本地兼容结果与来源
3. 页内翻译卡片在本地 GPU 策略下，会显示本地 GPU 结果并同步到侧边栏
4. 页内翻译卡片在本地兼容策略下，会显示本地兼容结果并同步到侧边栏
5. 当侧边栏已经打开时，页内翻译卡片会直接复用侧边栏里的本地模型结果

## 跑完以后看什么

如果结果正常，终端末尾会看到：

`BDD OK`

如果某条场景失败，终端里会直接打印失败场景名和失败位置。优先看这 3 类：

1. 是页内入口坏了
通常会卡在 `🐣`、卡片、选区同步这类场景。

2. 是侧边栏处理坏了
通常会卡在结果区、按钮、设置或导入能力。

3. 是引擎路线坏了
通常会卡在来源标签、回退逻辑、本地模型分支或浏览器 AI 分支。

## 最常见的排查顺序

如果 `BDD` 失败，建议按这个顺序查：

1. 先重新跑一次 `bun run build`
2. 再跑一次 `bun run test:bdd`
3. 如果还是失败，再看失败场景属于哪一组

通常判断方式：

1. 卡在悬停、卡片、`🐣`
先看 [content.ts](/Users/user/Documents/ai-proofduck-extension/entrypoints/content.ts)

2. 卡在侧边栏输入、结果、设置
先看 [App.tsx](/Users/user/Documents/ai-proofduck-extension/entrypoints/sidepanel/App.tsx)

3. 卡在实际引擎、回退、本地模型、浏览器 AI
先看 [executeProcessing.ts](/Users/user/Documents/ai-proofduck-extension/lib/processing/executeProcessing.ts)
再看 [background.ts](/Users/user/Documents/ai-proofduck-extension/entrypoints/background.ts)
和 [main.ts](/Users/user/Documents/ai-proofduck-extension/entrypoints/offscreen/main.ts)

## 和其他测试怎么配合

建议这样理解：

1. `smoke`
只看最核心主链路是否活着。

2. `test`
看局部逻辑和组件行为。

3. `test:bdd`
看用户真的会怎么用，以及这整条体验会不会断。

这三种都过，才算这轮回归比较稳。
