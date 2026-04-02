# AI ProofDuck 第一阶段设计文档

## 概述

**项目**: AI ProofDuck 浏览器扩展
**阶段**: 第一阶段 - 核心翻译功能
**目标**: 实现开箱即用的 AI 辅助翻译功能
**状态**: 设计完成，待实现

---

## 一、核心功能

### 1.1 四个主 Tab

| Tab | 功能 | 引擎 |
|-----|------|------|
| 翻译 | 文本翻译，源语言自动检测 | 通用翻译服务 |
| 校对 | 语法纠错、拼写检查 | 本地 AI |
| 润色 | 语句优化、提升表达 | 本地 AI |
| 扩写 | 内容丰富、细节补充 | 本地 AI |

### 1.2 交互入口

- **侧边栏 Tab 按钮**: 点击扩展图标打开侧边栏
- **快捷键**: 用户自定义（如 Cmd/Ctrl+Shift+T）
- **页面右键菜单**: 页面右键子菜单触发翻译
- **划词弹窗**: 选中文字后弹出翻译按钮

### 1.3 流式输出

所有 AI 处理结果（校对、润色、扩写）采用**流式输出**（Streaming），类似 ChatGPT 体验，逐字显示结果。

---

## 二、UI/UX 设计

### 2.1 侧边栏布局

```
┌────────────────────────┐
│ 🦆 ProofDuck      ⚙️  │  ← Header (品牌色 #FF5A11)
├────────────────────────┤
│ 翻译 │ 校对 │ 润色 │ 扩写 │  ← Tab Bar
├────────────────────────┤
│ [自动] → [中文 ▼] ●谷歌│  ← 顶部栏（翻译Tab有语言选择）
├────────────────────────┤
│ 原文                     │  ← 可滚动文本框
│ ┌──────────────────────┐│
│ │                      ││
│ │                      ││
│ └──────────────────────┘│
│ - - - - - - - - - - - -│  ← 分隔条
│ 结果                     │
│ ┌──────────────────────┐│
│ │                      ││
│ └──────────────────────┘│
├────────────────────────┤
│    [ 🌐 开始翻译 ]       │  ← 底部按钮
└────────────────────────┘
```

### 2.2 侧边栏特性

- **自适应高度**: 根据内容撑开，最大高度 90vh
- **文本框自适应**: textarea 可手动拖动调整大小
- **字符数显示**: 原文框和结果框显示当前字符数
- **独立滚动**: 内容多时自动滚动

### 2.3 Tab 切换

- 4 个独立 Tab 切换
- 底部按钮文案随 Tab 变化:
  - 翻译 → 🌐 开始翻译
  - 校对 → ✨ 开始校对
  - 润色 → ✨ 开始润色
  - 扩写 → ✨ 开始扩写

---

## 三、服务引擎架构

### 3.1 插件式引擎架构

```
TranslationEngine (Interface)
├── GoogleTranslateAdapter      # 通用翻译
├── BaiduTranslateAdapter      # 通用翻译
├── YoudaoTranslateAdapter      # 通用翻译
├── ChromeAIAdapter             # 本地 (Gemini Nano)
├── WebGPUAdapter               # 本地 (Qwen2.5)
├── WASMAdapter                # 本地 (NLLB-200)
├── OpenAIAdapter              # LLM API
├── ClaudeAdapter              # LLM API
├── DeepSeekAdapter            # LLM API
└── ...更多适配器

EngineManager
├── 优先级配置（可拖拽排序）
├── 自动降级逻辑
├── 引擎状态通知
└── 模型后台下载管理
```

### 3.2 引擎优先级（开箱即用）

1. **通用翻译服务** → 谷歌翻译（首选）
2. **本地服务** → Chrome AI / WebGPU / WASM
3. **LLM API** → 用户配置后使用

### 3.3 服务分类

#### 通用翻译服务
- 谷歌翻译 ✓
- 百度翻译
- 有道翻译
- DeepL

#### 本地服务
- Chrome AI (Gemini Nano) - 仅 Chrome 115+
- WebGPU (Qwen2.5) - 按需下载模型
- WASM (NLLB-200) - Firefox Translations 模型

#### LLM API
- OpenAI (GPT)
- Claude
- DeepSeek
- 通义千问
- Gemini

### 3.4 后台静默加载

- 勾选本地模型服务后，后台静默下载/加载
- 显示加载动画（橙色旋转图标）
- 完成后提示"已就绪"
- 不阻塞用户继续操作

---

## 四、交互设计

### 4.1 右键菜单
最简化设计，只显示 4 个功能：
```
右键页面
  └── 🦆 ProofDuck
        ├── 翻译页面
        ├── 🌐 翻译选中文字
        ├── ✨ 校对选中文字
        ├── 💎 润色选中文字
        └── 📝 扩写选中文字
```

### 4.2 划词交互
选中文字后**直接显示翻译结果浮层**，无需悬浮卡选择步骤。

### 4.3 翻译结果浮层
点击翻译后，显示流式翻译结果：

```
┌────────────────────────────────────┐
│ 🌐 谷歌翻译                  0.3s ×│  ← 标题栏
├────────────────────────────────────┤
│ 你好，世界！这是一个用于翻译测试的   │  ← 流式输出
│ 示例文本。The quick brown fox...   │
├────────────────────────────────────┤
│ 📋复制  🔊朗读  ↻重试            │  ← 操作按钮
└────────────────────────────────────┘
```

### 4.4 浮层特性
- **位置**：鼠标附近，自动调整位置，确保不遮挡且在可视区域内
- **大小**：自适应宽度/高度，最大 400px / 300px
- **输出**：流式输出（逐字显示，类似 ChatGPT）
- **引擎**：点击直接使用设置页配置的默认引擎，无需选择

---



## 五、类型定义

```typescript
interface TranslationEngine {
  readonly id: string;
  readonly name: string;
  readonly category: 'translation' | 'local' | 'llm';
  readonly priority: number;
  readonly capabilities: {
    supportedLanguages: string[];
    maxTextLength: number;
  };

  checkAvailability(): Promise<boolean>;
  translate(text: string, from: string, to: string): Promise<TranslationResult>;
  stream?(text: string, from: string, to: string): AsyncGenerator<string>;
}

interface TranslationResult {
  translatedText: string;
  engine: string;
  detectedLanguage?: string;
}

interface EngineState {
  currentEngine: string;
  status: 'idle' | 'translating' | 'error';
  error?: string;
  fallbackEngines: string[];
}

interface ServiceConfig {
  enabled: boolean;
  priority: number;
  status: 'available' | 'loading' | 'unavailable';
}
```

---

## 六、设置页设计

### 6.1 通用设置

| 设置项 | 说明 |
|--------|------|
| 自动翻译页面 | 打开网页时自动翻译 |
| 双语对照 | 译文显示在原文下方 |
| 默认目标语言 | 选择默认翻译目标语言 |

### 6.2 服务引擎管理

- **分组展开**: 通用翻译 / 本地服务 / LLM API
- **勾选启用**: 勾选后静默后台加载
- **拖拽排序**: 调整引擎优先级
- **状态显示**: ● 可用 / ○ 不可用 / 加载中 / 已就绪

---

## 七、全文翻译模式

### 7.1 激活方式

1. 打开侧边栏 → 翻译 Tab → 点击"翻译页面"按钮
2. 快捷键（用户自定义）
3. 右键页面菜单 → ProofDuck → 翻译页面

### 7.2 翻译流程

1. 检测页面语言
2. 根据语言自动选择源语言
3. 使用目标语言设置翻译
4. 遍历页面文本节点
5. 在原文下方插入译文（双语对照）

---

## 八、测试策略

### 8.1 测试覆盖

- **单元测试 (Vitest)**: 引擎适配器、工具函数
- **集成测试**: EngineManager、引擎切换逻辑
- **E2E 测试 (Playwright)**: 完整翻译流程
- **BDD 特性文件**: 核心用户场景

### 8.2 测试目录

```
tests/
├── unit/           # 单元测试
│   ├── engines/
│   ├── utils/
│   └── components/
├── integration/    # 集成测试
├── e2e/           # E2E 测试
│   └── popup/
└── bdd/          # BDD 特性文件
    └── features/
```

---

## 九、技术实现要点

### 9.1 WXT 扩展结构

```
entrypoints/
├── background.ts      # Service Worker
├── content.ts         # Content Script
└── popup/            # 侧边栏 UI (React)
    ├── App.tsx
    ├── main.tsx
    └── components/

src/
├── engines/           # 翻译引擎适配器
│   ├── interface.ts
│   ├── google.ts
│   ├── chrome-ai.ts
│   └── ...
├── core/
│   ├── EngineManager.ts
│   └── ModelLoader.ts
├── hooks/            # React hooks
├── stores/           # Zustand stores
└── types/            # TypeScript 类型
```

### 9.2 关键技术

- **React 19**: UI 框架
- **Zustand**: 状态管理（持久化到 chrome.storage）
- **流式处理**: ReadableStream / TextDecoder
- **Service Worker**: 后台模型下载

---

## 十、里程碑

| 里程碑 | 内容 |
|--------|------|
| M1 | 项目初始化、测试框架搭建 |
| M2 | 引擎适配器架构（至少支持谷歌翻译） |
| M3 | 侧边栏 UI 实现 |
| M4 | 全文翻译功能 |
| M5 | Chrome AI / 本地模型支持 |
| M6 | LLM API 集成 |
| M7 | 测试完善（单测 + E2E） |

---

## 十一、附录

### 11.1 参考资料

- [Firefox Translations](https://github.com/mozilla/firefox-translations) - WASM 翻译引擎参考
- [沉浸式翻译](https://immersive-translate.com/) - 产品参考
- [Chrome Built-in AI](https://developer.chrome.com/docs/ai/) - Gemini Nano 文档

### 11.2 设计稿

- 侧边栏线框图: `wireframe.html`
- 交互设计线框图: `wireframe-popup.html`
