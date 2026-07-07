/**
 * Engine 接口 —— 5 大引擎的统一契约
 *
 * 演化历史：
 * - M1: 定义 shape，纯骨架
 * - M2: 扩展 runStreaming（流式输出灵魂）
 *
 * 5 大引擎按此接口分别实现：
 *   chrome-ai / webllm / wasm / openai-compat / free-translate
 */

export type EngineId = 'chrome-ai' | 'webllm' | 'wasm' | 'openai-compat' | 'free-translate';

export type EngineMode = 'translate' | 'summarize' | 'correct' | 'polish' | 'expand';

export interface EngineRunInput {
  mode: EngineMode;
  text: string;
  /** 目标语言 BCP47 code（如 'zh'、'en'） */
  targetLang?: string;
  /** 源语言（可选，未提供时由引擎自行检测） */
  sourceLang?: string;
  maxTokens?: number;
  /**
   * v0.5.3: 用户可控的中断信号。传入后：
   *   - 网络类引擎（openai-compat / free-translate）会把它 forward 到 fetch(signal)
   *   - 上层调 controller.abort() 后正在进行的 fetch 立即抛 AbortError，UI 停止等待
   *   - engine 内部**仍会**叠加 30s 默认超时兜底，避免用户忘了传 signal 造成永久 loading
   * 塞进 input 而非 run 参数：避免破坏所有 Engine mock 的 signature
   */
  signal?: AbortSignal;
}

export interface Engine {
  /** 稳定唯一 ID */
  id: EngineId;
  /** 展示名（i18n 由上层做） */
  name: string;
  /**
   * 当前使用的模型标识（可选）。
   * openai-compat 场景下同一引擎会切换 gpt-4o / qwen-turbo 等，
   * 加进 cacheKey 才能防跨模型污染（v0.5.3 P1-3 Gemini review）。
   */
  model?: string;
  /** 优先级：越大越优先，EngineManager.pickBest 按此排序 */
  priority: number;
  /** 检测当前环境是否具备该引擎 */
  isAvailable: () => Promise<boolean>;
  /** 是否支持某种模式（如纯翻译引擎不支持 "扩写"） */
  supports: (mode: EngineMode) => boolean;
  /** 一次性执行推理，返回完整字符串 */
  run: (input: EngineRunInput) => Promise<string>;
  /**
   * 流式执行（可选）—— 返回逐 chunk 的 AsyncIterable
   * 不实现时上层降级到 run() 一次性调用
   */
  runStreaming?: (input: EngineRunInput) => AsyncIterable<string>;
}
