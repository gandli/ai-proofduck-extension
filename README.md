# 校对鸭

校对鸭是一个面向网页阅读与写作场景的 AI 侧边栏助手。用户可以在浏览网页时，对选中文本或整页内容进行翻译、摘要、校对、润色和扩写，并尽量在当前浏览流程里完成操作。

## 当前引擎策略

现在默认按这条顺序自动选择：

1. Chrome 内置 AI（Gemini Nano）
2. 本地模型
   - 有 WebGPU 时走 `web-llm`
   - 没有 WebGPU 时，可切到轻量 WASM 兼容模式
3. 在线 API
   - 支持 OpenAI 兼容格式，可接 OpenAI、DeepSeek、GLM 等
4. 第三方免费翻译兜底
   - 仅在翻译模式启用
   - 默认可直接走 Google 翻译
   - 也支持补充百度翻译开放平台 `APP ID / 密钥`，在 Google 失败时继续兜底

侧边栏会明确显示“首选策略”“实际使用引擎”“当前说明”和“加载进度”，方便判断这次到底走了哪条路。

## 技术栈

- WXT
- React
- TypeScript
- Tailwind CSS
- `@mlc-ai/web-llm`

## 开发命令

```bash
bun install
bun run dev
bun run build
bun run compile
bun run test
bun run test:bdd
bun run test:real
bun run test:chrome-probe
bun run smoke
```

如果你更习惯 `npm`，也可以直接替换成对应命令。

## 当前能力

- 页内选中文本后，可通过浮层入口直接发送到校对鸭
- 侧边栏可导入当前选区或抓取整页全文
- 五种处理模式已经接通统一入口
- 设置面板可管理自动优先、本地模型、在线 API，以及 Google / 百度翻译兜底
- 侧边栏主题已经统一为活力橙，并与 logo 配色对齐

## 验证方式

这套仓库现在至少需要跑这四条：

```bash
bun run test
bun run compile
bun run build
bun run test:bdd
bun run smoke
```

其中 `bun run smoke` 会快速验证主链路，`bun run test:bdd` 会用单个 `Chromium` 实例把主要用户场景完整走一遍，`bun run test:real` 会额外跑一次有界面的真实本地 GPU 主链路，`bun run test:chrome-probe` 只负责诊断这台机器上的 Chrome 正式版会不会拦自动化直开扩展页。

`bun run smoke` 会真实验证这条链路：

1. 在网页里选中文字
2. 发送到扩展侧边栏
3. 默认走本地兼容模式完成一次处理
4. 切到在线 API 并确认返回真实结果

`bun run test:bdd` 目前会覆盖这些场景：

1. 悬停 `🐣` 后页内翻译卡片和侧边栏同步显示
2. 翻译卡片在关闭、点击空白后消失；点击 `Copy` 只复制，不关闭
3. 点击 `🐣` 把选区送入侧边栏，并复用已有翻译结果
4. `导入选区` 与 `抓取全文` 两个按钮可用
5. 五种处理模式都能产出结果
6. 设置页随着首选策略切换显示对应设置区块
