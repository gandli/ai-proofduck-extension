# AI ProofDuck 开发计划

## 项目现状

### ✅ 已完成
- **I18n 基础设施**：`@wxt-dev/i18n` 集成，`src/i18n.ts` 封装，中英日三语言
- **单元测试**：Vitest 配置完成，8 个测试通过
- **E2E 测试**：Playwright 配置完成，测试超时问题待修复
- **图标资源**：icon.svg 已更新，icon-96.png 已生成
- **基础代码**：WXT 入口点、React 组件脚手架

### ❌ 待实现（核心功能）
- 五大写作模式（翻译/摘要/纠错/润色/扩写）
- 翻译引擎优先级系统
- 内容脚本（划词 + 全文获取）
- 设置面板
- AI 集成层

---

## TDD/BDD 测试驱动开发

### 开发流程（每个功能）

```
1. 编写 BDD 特性文件 (.feature)
       ↓
2. 生成 Step Definitions
       ↓
3. 编写单元测试 (Vitest) ← 红灯
       ↓
4. 编写实现代码           ← 绿灯
       ↓
5. 重构优化              ← 黄灯
       ↓
6. E2E 验证
```

### 测试金字塔

```
        ┌─────────────┐
        │    E2E      │  ← Playwright (5-10 个)
        ├─────────────┤
        │  集成测试    │  ← Vitest (20-30 个)
        ├─────────────┤
        │  单元测试    │  ← Vitest (50-100 个)
        └─────────────┘
```

### BDD 特性文件结构

```gherkin
# tests/bdd/features/translation.feature
Feature: 翻译功能

  Scenario: 用户输入英文文本并翻译成中文
    Given 用户打开了扩展弹窗
    And 当前模式为"翻译"
    When 用户在输入框输入 "Hello world"
    And 点击"翻译"按钮
    Then 输出框显示 "你好世界"
    And 显示"翻译成功"提示

  Scenario: 翻译引擎按优先级自动切换
    Given Chrome AI 不可用
    And WebGPU 不可用
    When 用户请求翻译
    Then 系统使用 OpenAI API 进行翻译
```

### 单元测试 TDD 循环

```typescript
// 1. 先写测试 (Red)
describe('useTranslation', () => {
  it('should return translated text', async () => {
    const { result } = renderHook(() => useTranslation());
    // 测试逻辑...
  });
});

// 2. 再写实现 (Green)
function useTranslation() {
  // 实现...
}

// 3. 重构 (Refactor)
```

### 测试文件组织

```
tests/
├── bdd/
│   ├── features/           # Gherkin 特性文件
│   │   ├── translation.feature
│   │   ├── summarize.feature
│   │   └── ...
│   ├── steps/             # Step Definitions
│   │   ├── translation.steps.ts
│   │   └── ...
│   └── support/           # BDD 辅助
│       └── hooks.ts
├── unit/
│   ├── hooks/             # Hook 测试
│   ├── utils/             # 工具函数测试
│   └── components/        # 组件测试
└── e2e/
    └── popup/             # E2E 测试
```

### Jest/Vitest BDD 集成

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { setupFiles } from './tests/bdd/support/hooks';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts', './tests/bdd/support/hooks.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
});
```

---

### 阶段 1：UI 框架与状态管理

**目标**：构建可扩展的 Popup UI 和状态管理

**任务**：
1. [ ] 重构 `App.tsx` - 实现 Tab 切换（翻译/摘要/纠错/润色/扩写）
2. [ ] 创建 `useWritingMode` hook - 管理当前写作模式
3. [ ] 创建 `TextInput` 组件 - 输入/输出文本区
4. [ ] 创建 `ActionButton` 组件 - 执行按钮
5. [ ] 创建 `ResultDisplay` 组件 - 结果展示
6. [ ] 更新 Zustand store - 添加 `useWritingStore`

**验收标准**：
- [ ] 5 个 Tab 可切换
- [ ] 文本可输入
- [ ] 执行按钮可点击

---

### 阶段 2：翻译引擎系统

**目标**：实现翻译引擎优先级系统

**任务**：
1. [ ] 创建 `src/engines/chrome-ai.ts` - Gemini Nano 集成
2. [ ] 创建 `src/engines/web-llm.ts` - 本地 WebGPU 模型
3. [ ] 创建 `src/engines/openai-api.ts` - OpenAI 兼容 API
4. [ ] 创建 `src/engines/google-translate.ts` - Google 翻译兜底
5. [ ] 创建 `src/engines/baidu-translate.ts` - 百度翻译兜底
6. [ ] 创建 `src/engines/index.ts` - 引擎选择逻辑
7. [ ] 创建 `src/hooks/useTranslation.ts` - 翻译 hook

**验收标准**：
- [ ] 自动检测可用引擎
- [ ] 按优先级尝试各引擎
- [ ] 引擎失败时自动切换

---

### 阶段 3：内容获取与处理

**目标**：实现智能内容获取

**任务**：
1. [ ] 更新 `content.ts` - 实现划词监听
2. [ ] 创建 `src/utils/contentExtractor.ts` - 页面正文提取
3. [ ] 创建 `src/hooks/useSelection.ts` - 选区监听 hook
4. [ ] 实现无选区时自动获取正文逻辑

**验收标准**：
- [ ] 划词时显示快捷操作
- [ ] 无选区时自动获取页面正文

---

### 阶段 4：其他 AI 模式

**目标**：实现摘要/纠错/润色/扩写模式

**任务**：
1. [ ] 创建 `src/hooks/useSummarize.ts` - 摘要 hook
2. [ ] 创建 `src/hooks/useProofread.ts` - 润色 hook
3. [ ] 创建 `src/hooks/useCorrect.ts` - 纠错 hook
4. [ ] 创建 `src/hooks/useExpand.ts` - 扩写 hook
5. [ ] 更新 UI 响应各模式

**验收标准**：
- [ ] 5 种模式均可执行
- [ ] 结果正确展示

---

### 阶段 5：设置面板

**目标**：实现用户配置

**任务**：
1. [ ] 创建 `entrypoints/popup/Settings.tsx` - 设置面板
2. [ ] 添加语言方向选择（源语言/目标语言）
3. [ ] 添加 API Key 配置
4. [ ] 添加引擎优先级配置
5. [ ] 持久化设置到 `chrome.storage`

**验收标准**：
- [ ] 设置可保存
- [ ] 设置可加载

---

### 阶段 6：UI 优化与品牌

**目标**：精致的品牌 UI

**任务**：
1. [ ] 实现活力橙 `#FF5A11` 主题
2. [ ] 添加小鸭子图标/元素
3. [ ] 紧凑布局优化
4. [ ] 响应式适配

**验收标准**：
- [ ] 品牌色正确应用
- [ ] 布局紧凑美观

---

## 技术决策

### 引擎优先级实现

```typescript
type TranslationEngine = 
  | 'chrome-ai'      // 最高优先
  | 'web-llm'        // 次优先
  | 'openai-api'     // 第三优先
  | 'google-translate' // 兜底
  | 'baidu-translate'; // 最后兜底

async function translate(text: string, from: string, to: string): Promise<string> {
  const engines: TranslationEngine[] = [
    'chrome-ai',
    'web-llm', 
    'openai-api',
    'google-translate',
    'baidu-translate'
  ];
  
  for (const engine of engines) {
    try {
      const result = await executeEngine(engine, text, from, to);
      if (result.success) return result.text;
    } catch (e) {
      console.warn(`${engine} failed, trying next...`);
    }
  }
  throw new Error('All translation engines failed');
}
```

### 状态管理结构

```typescript
interface WritingState {
  mode: 'translate' | 'summarize' | 'correct' | 'proofread' | 'expand';
  inputText: string;
  outputText: string;
  loading: boolean;
  error: string | null;
  settings: {
    sourceLang: string;
    targetLang: string;
    apiKey?: string;
    enginePriority: TranslationEngine[];
  };
}
```

---

## 里程碑

| 里程碑 | 内容 | 目标 |
|--------|------|------|
| M1 | UI 框架 + 翻译引擎 | 第 1 周 |
| M2 | 全部 5 种写作模式 | 第 2 周 |
| M3 | 设置面板 + 内容获取 | 第 3 周 |
| M4 | UI 优化 + 品牌化 | 第 4 周 |
| M5 | 完整测试 + 发布 | 第 5 周 |

---

## 依赖关系

```
阶段 1 (UI 框架)
    ↓
阶段 2 (翻译引擎) ← 需要阶段 1
    ↓
阶段 4 (其他 AI 模式) ← 需要阶段 1
    ↓
阶段 3 (内容获取) ← 可并行
    ↓
阶段 5 (设置面板) ← 可并行
    ↓
阶段 6 (UI 优化)
```

---

## 建议开发顺序

1. **先完成 UI 框架** - 奠定基础
2. **优先实现翻译引擎** - 核心功能
3. **并行开发内容获取** - 提升体验
4. **实现其他模式** - 丰富功能
5. **最后优化 UI** - 收尾工作
