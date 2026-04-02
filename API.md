# API 文档

AI ProofDuck 扩展的程序化接口文档。

## 目录

- [类型定义](#类型定义)
- [引擎接口](#引擎接口)
- [EngineManager](#enginemanager)
- [EngineStore](#enginestore)
- [消息协议](#消息协议)
- [引擎适配器](#引擎适配器)

---

## 类型定义

所有类型定义位于 `src/types/index.ts`。

### AIMode

AI 操作模式枚举。

```typescript
type AIMode = 'translate' | 'proofread' | 'polish' | 'expand';
```

| 值 | 说明 |
|-----|------|
| `translate` | 翻译模式 |
| `proofread` | 校对模式 |
| `polish` | 润色模式 |
| `expand` | 扩写模式 |

### TranslationResult

翻译操作返回的结果。

```typescript
interface TranslationResult {
  translatedText: string;    // 翻译后的文本
  engine: string;           // 使用的引擎 ID
  detectedLanguage?: string; // 检测到的源语言
  duration?: number;         // 操作耗时（毫秒）
}
```

### ProofreadResult

校对操作返回的结果。

```typescript
interface ProofreadResult {
  correctedText: string;    // 校对后的文本
  corrections: Correction[]; // 修正列表
  engine: string;            // 使用的引擎 ID
  duration?: number;         // 操作耗时（毫秒）
}
```

### Correction

单个校对修正项。

```typescript
interface Correction {
  original: string;   // 原文
  corrected: string;  // 修正后
  message?: string;   // 修正说明
}
```

### StreamChunk

流式输出的单个片段。

```typescript
interface StreamChunk {
  delta: string;  // 本次输出的文本片段
  done: boolean;  // 是否为最后一个片段
}
```

### EngineStatus

引擎状态枚举。

```typescript
type EngineStatus = 'idle' | 'translating' | 'error' | 'ready';
```

| 值 | 说明 |
|-----|------|
| `idle` | 空闲 |
| `translating` | 翻译中 |
| `error` | 错误状态 |
| `ready` | 就绪可用 |

---

## 引擎接口

`TranslationEngine` 是所有翻译引擎必须实现的接口。

```typescript
interface TranslationEngine {
  readonly id: string;              // 引擎唯一标识
  readonly name: string;            // 引擎显示名称
  readonly category: 'translation' | 'local' | 'llm';
  readonly priority: number;         // 优先级（数值越大越优先）
  readonly capabilities: EngineCapabilities;

  // 检测引擎是否可用
  checkAvailability(): Promise<boolean>;

  // 翻译文本
  translate(text: string, from: string, to: string): Promise<TranslationResult>;

  // 可选：流式翻译
  stream?(text: string, from: string, to: string): AsyncGenerator<StreamChunk>;
}
```

### EngineCapabilities

引擎能力描述。

```typescript
interface EngineCapabilities {
  supportedLanguages: string[];  // 支持的语言代码
  maxTextLength: number;          // 最大文本长度
}
```

### 实现示例

```typescript
class MyCustomAdapter implements TranslationEngine {
  readonly id = 'my-custom';
  readonly name = 'My Custom Engine';
  readonly category = 'llm';
  readonly priority = 10;
  readonly capabilities = {
    supportedLanguages: ['en', 'zh', 'ja'],
    maxTextLength: 10000,
  };

  async checkAvailability(): Promise<boolean> {
    return true;
  }

  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    // 实现翻译逻辑
    const translatedText = await doTranslate(text, from, to);
    return {
      translatedText,
      engine: this.id,
    };
  }
}
```

---

## EngineManager

引擎管理器，负责引擎注册、调度和自动降级。

### 获取实例

```typescript
import { getEngineManager, createEngineManager } from '@/core/EngineManager';

// 获取单例（推荐）
const manager = getEngineManager();

// 创建新实例（会替换单例）
const newManager = createEngineManager();
```

### 注册引擎

```typescript
const manager = getEngineManager();
manager.register(myCustomAdapter);
```

### 注销引擎

```typescript
manager.unregister('google');
```

### 获取引擎

```typescript
// 获取指定引擎
const engine = manager.getEngine('openai');

// 获取所有已注册引擎
const allEngines = manager.getAllEngines();

// 获取所有可用引擎（按优先级排序）
const availableEngines = await manager.getAvailableEngines();
```

### 翻译操作

```typescript
// 基本翻译
const result = await manager.translate('Hello', 'en', 'zh');
console.log(result.translatedText); // 你好
console.log(result.engine); // openai

// 流式翻译
for await (const chunk of manager.streamTranslate('Hello', 'en', 'zh')) {
  console.log(chunk.delta); // 逐步输出
  if (chunk.done) break;
}
```

### 引擎信息

```typescript
// 获取引擎信息列表
const infos = await manager.getEngineInfos();
console.log(infos);
// [
//   { id: 'openai', name: 'OpenAI', status: 'ready' },
//   { id: 'google', name: 'Google Translate', status: 'ready' },
// ]

// 检查是否有可用引擎
const hasEngine = await manager.hasAvailableEngine();
```

### 设置当前引擎

```typescript
// 设置优先使用的引擎
manager.setCurrentEngine('claude');

// 获取当前引擎 ID
const currentId = manager.getCurrentEngineId();

// 获取当前引擎实例
const current = manager.getCurrentEngine();
```

---

## EngineStore

Zustand store，用于持久化用户引擎偏好设置。

### 导入

```typescript
import { useEngineStore } from '@/stores/engine';
```

### State

```typescript
interface EngineState {
  selectedEngineId: string | null;    // 当前选中引擎
  enabledEngines: Record<string, boolean>;  // 引擎启用状态
  enginePriorities: Record<string, number>; // 引擎优先级
  engineInfos: EngineInfo[];           // 引擎信息缓存
  sourceLang: string;                 // 源语言
  targetLang: string;                 // 目标语言
  autoTranslate: boolean;             // 自动翻译
  bilingualMode: boolean;             // 双语模式
  isTranslating: boolean;            // 翻译中状态
  lastError: string | null;          // 最近错误
}
```

### Actions

```typescript
// 设置选中引擎
useEngineStore.getState().setSelectedEngine('openai');

// 设置引擎启用状态
useEngineStore.getState().setEngineEnabled('google', false);

// 设置引擎优先级
useEngineStore.getState().setEnginePriority('claude', 15);

// 设置语言
useEngineStore.getState().setSourceLang('en');
useEngineStore.getState().setTargetLang('zh');

// 设置选项
useEngineStore.getState().setAutoTranslate(true);
useEngineStore.getState().setBilingualMode(false);

// 更新引擎信息
useEngineStore.getState().updateEngineInfo('openai', { status: 'ready' });

// 设置错误
useEngineStore.getState().setLastError(null);

// 重置为默认值
useEngineStore.getState().reset();
```

### 辅助函数

```typescript
import { isSelectedEngineEnabled, getEngineStatus } from '@/stores/engine';

// 检查选中引擎是否启用
const enabled = isSelectedEngineEnabled();

// 获取引擎状态
const status = getEngineStatus('openai');
```

---

## 消息协议

扩展内部通信使用特定的消息格式。

### Content → Background

```typescript
interface ContentToBackgroundMessage {
  type: 'translate' | 'proofread' | 'polish' | 'expand' | 'translatePage';
  text: string;
  mode?: AIMode;
}
```

### Background → Content

```typescript
interface BackgroundToContentMessage {
  type: 'translationResult' | 'proofreadResult' | 'error';
  originalText: string;
  result: TranslationResult | ProofreadResult;
  error?: string;
}
```

### 完整页面翻译

```typescript
interface FullPageTranslationRequest {
  sourceLang: string;
  targetLang: string;
  bilingualMode: boolean;
}

interface FullPageTranslationProgress {
  current: number;
  total: number;
  currentText: string;
}
```

---

## 引擎适配器

项目内置的引擎适配器。

### Google Translate

免费翻译引擎，作为兜底方案。

```typescript
import { googleTranslateAdapter } from '@/engines/google';

// 检测可用性（始终返回 true）
const available = await googleTranslateAdapter.checkAvailability();

// 翻译
const result = await googleTranslateAdapter.translate('Hello', 'en', 'zh');

// 流式翻译
for await (const chunk of googleTranslateAdapter.stream('Hello', 'en', 'zh')) {
  console.log(chunk.delta);
}
```

### OpenAI

```typescript
import { openAIAdapter } from '@/engines/openai';
```

### Claude

```typescript
import { claudeAdapter } from '@/engines/claude';
```

### DeepSeek

```typescript
import { deepSeekAdapter } from '@/engines/deepseek';
```

### Qwen

```typescript
import { qwenAdapter } from '@/engines/qwen';
```

### Gemini

```typescript
import { geminiAdapter } from '@/engines/gemini';
```

### Chrome AI

```typescript
import { chromeAIAdapter } from '@/engines/chrome-ai';
```

### WebGPU

```typescript
import { webGPUAdapter } from '@/engines/webgpu';
```

### WASM

```typescript
import { wasmAdapter } from '@/engines/wasm';
```

### LLM 适配器集合

```typescript
import { LLM_ADAPTERS, type LLMProvider } from '@/engines';

const providers: LLMProvider[] = ['openai', 'claude', 'deepseek', 'qwen', 'gemini'];

for (const provider of providers) {
  const adapter = LLM_ADAPTERS[provider];
  // 使用 adapter
}
```

---

## 错误处理

### EngineError

引擎操作中发生的错误。

```typescript
import { EngineError } from '@/core/EngineManager';

try {
  await manager.translate('Hello', 'en', 'zh');
} catch (error) {
  if (error instanceof EngineError) {
    console.error(`Engine "${error.engineId}" failed: ${error.message}`);
    console.error('Is retryable:', error.isRetryable);
  }
}
```

### 错误响应格式

```typescript
// API 调用错误
{
  success: false,
  error: 'Error message here'
}

// 或抛出 EngineError
throw new EngineError('Translation failed', 'openai', true);
```

---

## 使用示例

### 完整翻译流程

```typescript
import { getEngineManager } from '@/core/EngineManager';
import { googleTranslateAdapter, openAIAdapter } from '@/engines';
import { useEngineStore } from '@/stores/engine';

// 1. 注册引擎
const manager = getEngineManager();
manager.register(openAIAdapter);
manager.register(googleTranslateAdapter); // 作为兜底

// 2. 设置用户偏好
useEngineStore.getState().setSelectedEngine('openai');

// 3. 执行翻译
async function translateText(text: string, from: string, to: string) {
  useEngineStore.getState().setTranslating(true);
  useEngineStore.getState().setLastError(null);

  try {
    const result = await manager.translate(text, from, to);
    return result.translatedText;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Translation failed';
    useEngineStore.getState().setLastError(message);
    throw error;
  } finally {
    useEngineStore.getState().setTranslating(false);
  }
}

// 4. 使用
const translated = await translateText('Hello', 'en', 'zh');
console.log(translated);
```

### 流式翻译展示

```typescript
async function streamTranslate(text: string, onChunk: (text: string) => void) {
  const manager = getEngineManager();
  let fullText = '';

  for await (const chunk of manager.streamTranslate(text, 'en', 'zh')) {
    fullText += chunk.delta;
    onChunk(fullText);
    if (chunk.done) break;
  }

  return fullText;
}

// 使用
await streamTranslate('Hello', (text) => {
  // 更新 UI
  document.getElementById('result').textContent = text;
});
```

### 添加自定义引擎

```typescript
import type { TranslationEngine, TranslationResult } from '@/types';

class MyCustomAdapter implements TranslationEngine {
  readonly id = 'my-custom';
  readonly name = 'My Custom Translation';
  readonly category = 'llm';
  readonly priority = 15;
  readonly capabilities = {
    supportedLanguages: ['en', 'zh'],
    maxTextLength: 5000,
  };

  async checkAvailability(): Promise<boolean> {
    return true;
  }

  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    // 调用你的 API
    const result = await myCustomAPI.translate(text, from, to);
    return {
      translatedText: result.text,
      engine: this.id,
    };
  }
}

// 注册
const manager = getEngineManager();
manager.register(new MyCustomAdapter());
```