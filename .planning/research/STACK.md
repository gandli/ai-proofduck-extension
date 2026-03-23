# Stack Research

## Recommended Stack

- **Framework**: WXT
- **UI**: React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest + Playwright
- **Package manager**: Bun or npm

## Why This Fits

- WXT 适合现代浏览器扩展开发，天然支持多入口和多浏览器打包。
- React 适合侧边栏这种状态较重的界面。
- TypeScript 有利于跨上下文消息和状态边界管理。
- Tailwind 适合快速构建侧边栏和弹层类界面。
- Vitest 和 Playwright 可以分别覆盖逻辑验证与真实浏览器行为。

## Non-Goals

- 不在初始化阶段切换到别的扩展框架。
- 不在 v1 阶段引入复杂后端或原生客户端栈。
