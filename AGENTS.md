# AI ProofDuck Extension - Agent Guidelines

## 交流规范（中文优先）

**与我沟通时**，请做到：
- **说结果**：用简单直白的语言，告诉我你做了什么，结果如何
- **说人话**：避免使用术语、技术细节和代码风格的表达，就当是向一个不懂技术的聪明人解释
- **要交付成品**：在向我汇报前，确保工作已经完成、验证过了，给我一个可以直接使用的成果，而不是需要反复检查的半成品

**工作时**，请做到：
- **先定标准**：动手前，想清楚这个任务做到什么程度才算完成，并把它作为最终的检查清单
- **充分验证**：
  - 如果是代码或脚本，用真实或典型的例子运行一遍，检查输出是否正确，边界情况也要试试
  - 如果是网页或应用，打开页面亲自操作一遍，确保显示和交互都正常
- **自主修正**：如果发现任何问题，先尝试自己修复并重新测试，而不是只把问题标记出来交给我
- **谨慎修改**：除非有百分之百的证据支持，否则不要轻易改动代码的核心逻辑

**简单来说**：你负责严谨、完整地实现和验证；我负责听取清晰、直白的最终汇报。只有在一切就绪，或确实遇到需要我协助的障碍时，再回来找我。

---

## 搜索与分析规范

### 搜索模式（search-mode）
**MAXIMIZE SEARCH EFFORT.** Launch multiple background agents IN PARALLEL:
- explore agents (codebase patterns, file structures, ast-grep)
- librarian agents (remote repos, official docs, GitHub examples)
- Plus direct tools: Grep, ripgrep (rg), ast-grep (sg)
- NEVER stop at first result - be exhaustive

### 分析模式（analyze-mode）
**ANALYSIS MODE.** Gather context before diving deep:

**CONTEXT GATHERING (parallel):**
- 1-2 explore agents (codebase patterns, implementations)
- 1-2 librarian agents (if external library involved)
- Direct tools: Grep, AST-grep, LSP for targeted searches

**IF COMPLEX - DO NOT STRUGGLE ALONE. Consult specialists:**
- **Oracle**: Conventional problems (architecture, debugging, complex logic)
- **Artistry**: Non-conventional problems (different approach needed)

**SYNTHESIZE findings before proceeding.**

---

## 项目概述

**校对鸭 (AI ProofDuck)** - 本地 WebGPU 加速的网页翻译 + 专业审阅校对工具。

**技术栈**: Manifest V3 + Service Worker + React 19 + TypeScript + TailwindCSS + Zustand + @huggingface/transformers

---

## 核心功能

### ✨ 多模式写作辅助（翻译优先）

- **翻译 (Translate)**：精准翻译，支持全文翻译
- **摘要 (Summarize)**：快速提炼长文核心观点
- **纠错 (Correct)**：修正语法错误与拼写问题
- **润色 (Proofread)**：优化语句通顺度，提升专业性
- **扩写 (Expand)**：基于现有内容丰富细节

### 🔒 本地优先隐私链路

优先使用 Chrome 内置 AI 或本地 WebGPU/WASM 模型（如 Qwen2.5），尽量在设备侧处理文本。

### 🌐 云端增强链路

兼容 OpenAI 格式 API（如 OpenRouter / Cloudflare AI 预设），在需要时使用更强云端模型。

### 🛟 翻译兜底链路

翻译模式可在 AI 不可用或未配置 API Key 时，启用第三方免费翻译兜底（可在设置中关闭/切换）。

### 翻译引擎优先级

1. **Chrome 内置 AI（Gemini Nano）**
   - 检测 Chrome 内置 AI availability
   - 优先启用，享受最佳性能

2. **本地模型**
   - 有 WebGPU 时走 web-llm
   - 没有 WebGPU 时，可切到轻量 WASM 兼容模式

3. **在线 API**
   - 支持 OpenAI 兼容格式
   - 可接 OpenAI、DeepSeek、GLM 等

4. **第三方免费翻译兜底**
   - 仅在翻译模式启用
   - 默认可直接走 Google 翻译
   - 也支持补充百度翻译开放平台 APP ID / 密钥，在 Google 失败时继续兜底

### 📑 智能内容获取

- 支持划词即时处理
- 无选区时自动获取当前页面正文，方便全文摘要

### 🎨 精致 UI 设计

- **活力橙主题**：采用 `#FF5A11` 品牌色，界面现代简洁
- **极致紧凑**：极大化内容展示空间，操作直观
- **国际化**：支持中英双语界面

---

## 开发命令

```bash
# 开发
bun dev              # 启动开发服务器 (localhost:3000)
bun dev:firefox      # Firefox 开发

# 构建
bun build           # 构建生产版本
bun build:firefox    # Firefox 构建
bun zip             # 打包 zip
bun zip:firefox     # Firefox 打包

# 类型检查
bun compile         # TypeScript 类型检查

# 测试
bun test            # 运行单元测试 (Vitest)
bun test:run        # 单次运行测试
bun test:ui          # Vitest UI
bun test:e2e        # Playwright E2E 测试
bun test:e2e:headed  # Playwright 有头模式

# 安装依赖
bun i               # 安装依赖
```

---

## 代码风格

### 通用

- 使用 **TypeScript 严格模式**
- 所有异步操作必须有 `try/catch`、loading 状态、错误处理
- 保持代码模块化，职责单一
- 使用中文注释（核心逻辑）

### 导入顺序

```typescript
// 1. React / 框架
import { useState, useEffect } from 'react';

// 2. 外部库
import { create } from 'zustand';

// 3. 内部模块 (@/ 指向 src/)
import { t } from '@/i18n';

// 4. 类型
import type { SomeType } from '@/types';

// 5. 样式
import './Component.css';
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `App.tsx`, `ProofReader.tsx` |
| Hooks | camelCase, 以 `use` 开头 | `useTranslation()`, `useProofreading()` |
| 工具函数 | camelCase | `formatText()`, `checkGrammar()` |
| 常量 | UPPER_SNAKE | `MAX_TOKENS`, `DEFAULT_LANG` |
| 类型/接口 | PascalCase | `TranslationResult`, `ProofreadOptions` |
| 文件名 | kebab-case | `proof-reader.ts`, `settings-panel.tsx` |

### React 组件模式

```tsx
import { useState, useCallback } from 'react';
import { t } from '@/i18n';
import { useStore } from '@/store';
import type { ProofreadResult } from '@/types';

interface Props {
  initialText: string;
  onComplete?: (result: ProofreadResult) => void;
}

export function ProofReader({ initialText, onComplete }: Props) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = useStore();

  const handleProofread = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await proofread(text);
      onComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [text, onComplete]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;

  return <div>{/* component content */}</div>;
}
```

### 错误处理

```typescript
// 异步操作
async function fetchTranslation(text: string): Promise<Result> {
  try {
    const response = await api.translate(text);
    return { success: true, data: response };
  } catch (error) {
    console.error('Translation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed'
    };
  }
}

// 同步操作
function validateInput(text: string): ValidationResult {
  if (!text.trim()) {
    return { valid: false, error: 'Text cannot be empty' };
  }
  return { valid: true };
}
```

---

## WXT 扩展开发规范

### 入口点结构

```
entrypoints/
├── background.ts    # Service Worker
├── content.ts       # Content Script
├── popup/           # Popup UI
│   ├── App.tsx
│   ├── main.tsx
│   └── index.html
└── sidepanel/       # Side Panel (未来)
```

### Service Worker (background.ts)

```typescript
import { t } from '../src/i18n';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 处理消息
    return true; // 保持消息通道开放用于异步响应
  });
});
```

### Content Script (content.ts)

```typescript
import { t } from '../src/i18n';

export default defineContentScript({
  matches: ['*://*.google.com/*', '*://*.wikipedia.org/*'],
  main() {
    console.log(t('contentHello'));
  },
});
```

### i18n 使用

```typescript
// src/i18n.ts
import { createI18n } from '@wxt-dev/i18n';

export const i18n = createI18n();
export const t = i18n.t.bind(i18n);

// 使用
import { t } from '@/i18n';
const greeting = t('popupTitle');
```

### Storage 使用 (Zustand + chrome.storage)

```typescript
// store/settings.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  sourceLang: string;
  targetLang: string;
  theme: 'light' | 'dark';
}

export const useSettingsStore = create<Settings>()(
  persist(
    (set) => ({
      sourceLang: 'en',
      targetLang: 'zh',
      theme: 'light',
      setSourceLang: (lang) => set({ sourceLang: lang }),
      setTargetLang: (lang) => set({ targetLang: lang }),
    }),
    { name: 'proofduck-settings' }
  )
);
```

---

## 文件组织

```
src/
├── i18n.ts              # 国际化
├── store/                # Zustand stores
│   ├── settings.ts
│   └── proofreading.ts
├── hooks/                # Custom hooks
│   ├── useTranslation.ts
│   └── useProofreading.ts
├── utils/                # 工具函数
│   └── textProcessor.ts
├── components/           # 共享组件
│   ├── Spinner.tsx
│   └── ErrorMessage.tsx
└── types/               # TypeScript 类型
    └── index.ts

public/
├── _locales/            # i18n 文件
│   ├── en/messages.json
│   ├── zh/messages.json
│   └── ja/messages.json
└── icons/               # 图标资源
```

---

## 品牌/UI 规范

- **品牌色**: `#FF5A11` (活力橙)
- **风格**: 简洁可爱但专业
- **图标**: 使用橙黄色小鸭子风格 SVG
- **按钮**: 可加入小鸭子元素
- **布局**: 极致紧凑，最大化内容展示

---

## 测试规范

### TDD 开发流程

每个功能开发遵循 **Red → Green → Refactor** 循环：

```
1. 编写失败测试 (Red)
       ↓
2. 编写最小实现 (Green)
       ↓
3. 重构优化 (Refactor)
       ↓
4. 重复
```

### BDD 特性文件 (Gherkin)

```gherkin
# tests/bdd/features/translation.feature
Feature: 翻译功能

  Scenario: 正常翻译流程
    Given 用户在翻译模式
    When 输入 "Hello"
    Then 输出 "你好"

  Scenario: 翻译引擎按优先级自动切换
    Given Chrome AI 不可用
    When 用户请求翻译
    Then 系统使用下一个可用引擎
```

### 单元测试 (Vitest)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { handleProofread } from '@/utils/proofreader';

vi.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

describe('handleProofread', () => {
  it('should return proofread result', async () => {
    const result = await handleProofread('Hello world');
    expect(result).toBeDefined();
  });
  
  it('should handle empty input', async () => {
    await expect(handleProofread('')).rejects.toThrow();
  });
});
```

### E2E 测试 (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('popup loads correctly', async ({ page }) => {
  await page.goto('http://localhost:3000/popup.html');
  await expect(page.locator('h1')).toContainText('ProofDuck');
});
```

---

## 构建输出

- 开发输出: `.output/chrome-mv3-dev/`
- 生产构建: `.output/chrome-mv3-prod/`
- 扩展加载: Chrome → `chrome://extensions/` → 开发者模式 → 加载解压扩展
