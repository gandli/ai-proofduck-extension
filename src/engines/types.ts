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
}

export interface Engine {
  /** 稳定唯一 ID */
  id: EngineId;
  /** 展示名（i18n 由上层做） */
  name: string;
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
