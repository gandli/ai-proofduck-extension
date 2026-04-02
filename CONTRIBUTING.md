# 贡献指南

感谢您对 AI ProofDuck 的关注！本文档将帮助您了解如何参与项目贡献。

## 目录

- [行为准则](#行为准则)
- [开始贡献](#开始贡献)
- [开发环境](#开发环境)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试规范](#测试规范)
- [文档规范](#文档规范)

## 行为准则

我们期望所有贡献者都能遵守以下原则：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 与社区成员友好互动

## 开始贡献

### Fork 仓库

```bash
# Fork 后克隆到本地
git clone https://github.com/your-username/ai-proofduck-extension.git
cd ai-proofduck-extension

# 添加上游仓库
git remote add upstream https://github.com/original-owner/ai-proofduck-extension.git
```

### 创建分支

```bash
# 基于 main 创建功能分支
git checkout -b feature/your-feature-name

# 或创建修复分支
git checkout -b fix/issue-number
```

## 开发环境

### 环境要求

- **Bun** >= 1.0 (推荐)
- **Node.js** >= 18 (可选)
- **Chrome** 128+ / **Firefox** 130+ / **Edge** 128+

### 安装依赖

```bash
bun install
```

### 启动开发

```bash
# Chrome 开发
bun dev

# Firefox 开发
bun dev:firefox
```

### 类型检查

```bash
bun compile
```

## 开发流程

### 1. 选择任务

- 查看 [Issues](https://github.com/your-repo/ai-proofduck-extension/issues) 中标记为 `good first issue` 或 `help wanted` 的任务
- 在开始工作前，请先在 Issue 下评论，说明您打算如何解决

### 2. 开发步骤

```
1. 从 main 创建新分支
        ↓
2. 编写代码和单元测试
        ↓
3. 确保所有测试通过
        ↓
4. 更新相关文档
        ↓
5. 提交 Pull Request
```

### 3. Pull Request 流程

1. 保持 PR 专注于单一功能或修复
2. 填写 PR 模板中的所有字段
3. 确保 CI/CD 通过
4. 等待代码审查

## 代码规范

### TypeScript

- 启用严格模式
- 使用显式类型声明
- 避免使用 `any` 类型

```typescript
// 推荐
function greet(name: string): string {
  return `Hello, ${name}`;
}

// 避免
function greet(name: any) {
  return `Hello, ${name}`;
}
```

### React 组件

- 使用函数式组件 + Hooks
- 组件文件使用 PascalCase
- Props 接口使用 Props 后缀

```tsx
interface ButtonProps {
  label: string;
  onClick?: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

### 导入顺序

```typescript
// 1. React / 框架
import { useState, useEffect } from 'react';

// 2. 外部库
import { create } from 'zustand';

// 3. 内部模块
import { t } from '@/i18n';

// 4. 类型定义
import type { EngineInfo } from '@/types';

// 5. 样式
import './Button.css';
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `ProofReader.tsx` |
| Hooks | camelCase, use 前缀 | `useTranslation()` |
| 工具函数 | camelCase | `formatText()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_TOKENS` |
| 类型/接口 | PascalCase | `TranslationResult` |
| 文件名 | kebab-case | `proof-reader.ts` |

## 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | Description |
|------|-------------|
| feat | 新功能 |
| fix | 修复 Bug |
| docs | 文档变更 |
| style | 代码格式（不影响功能）|
| refactor | 重构（不是修复也不是新功能）|
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建或辅助工具变更 |

### 示例

```
feat(engine): add WebGPU adapter support

Add WebGPU adapter for local model inference with fallback
to WASM mode when WebGPU is not available.

Closes #123
```

## 测试规范

### 单元测试 (Vitest)

```bash
# 运行所有单元测试
bun test

# 单次运行
bun test:run

# 打开 Vitest UI
bun test:ui
```

### 测试文件命名

- 测试文件应与源文件同名
- 后缀 `.test.ts` 或 `.spec.ts`

```bash
# 源文件
src/utils/textProcessor.ts

# 对应测试
src/utils/textProcessor.test.ts
```

### 测试示例

```typescript
import { describe, it, expect, vi } from 'vitest';
import { formatText } from '@/utils/textProcessor';

vi.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

describe('formatText', () => {
  it('should format text correctly', () => {
    const result = formatText('hello world');
    expect(result).toBe('Hello World');
  });

  it('should handle empty string', () => {
    expect(formatText('')).toBe('');
  });
});
```

### E2E 测试 (Playwright)

```bash
# 运行 E2E 测试
bun test:e2e

# 有头模式
bun test:e2e:headed

# 打开 Playwright UI
bun test:e2e:ui
```

### E2E 测试规范

- 每个功能至少有一个 E2E 测试
- 使用 BDD 风格的测试描述

```typescript
import { test, expect } from '@playwright/test';

test.describe('Translation', () => {
  test('should translate selected text', async ({ page }) => {
    await page.goto('https://example.com');
    // ...
  });
});
```

## 文档规范

### 代码注释

- 公共 API 必须有 JSDoc 注释
- 复杂逻辑需要添加解释注释
- 使用中文注释核心逻辑

```typescript
/**
 * 计算翻译后的文本长度
 * @param text 源文本
 * @param from 源语言
 * @param to 目标语言
 * @returns 预估的目标语言文本长度
 */
function estimateLength(text: string, from: string, to: string): number {
  // 长度估算逻辑
}
```

### 更新文档

如果您的更改涉及以下内容，请同时更新文档：

- API 的更改 → 更新 `API.md`
- 配置选项 → 更新 `README.md`
- 贡献流程 → 更新 `CONTRIBUTING.md`

## 常见问题

### Q: 开发时扩展没有热更新？

尝试手动重新加载扩展：
1. 打开 `chrome://extensions/`
2. 点击扩展卡片下的刷新按钮

### Q: 测试失败如何处理？

1. 确保依赖已正确安装
2. 检查是否有未迁移的更改
3. 查看 CI/CD 日志定位问题

### Q: 如何添加新的翻译引擎？

参考 `src/engines/` 下的现有适配器实现，实现 `TranslationEngine` 接口并注册到 `EngineManager`。

## 获取帮助

- 查看 [AGENTS.md](./AGENTS.md) - 项目开发指南
- 查看 [API.md](./API.md) - API 文档
- 创建 [Issue](https://github.com/your-repo/ai-proofduck-extension/issues) 提问

---

再次感谢您的贡献！