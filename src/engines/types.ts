/**
 * Engine 接口 —— M2 各引擎的契约
 *
 * M1 只定义 shape，真正实现（chrome-ai / webllm / wasm / openai-compat / free-translate）
 * 在 M2 分别落地。
 */

export type EngineId = 'chrome-ai' | 'webllm' | 'wasm' | 'openai-compat' | 'free-translate';

export type EngineMode = 'translate' | 'summarize' | 'correct' | 'polish' | 'expand';

export interface EngineRunInput {
  mode: EngineMode;
  text: string;
  targetLang?: string;
  maxTokens?: number;
}

export interface Engine {
  /** 稳定唯一 ID */
  id: EngineId;
  /** 展示名（i18n 由上层做） */
  name: string;
  /** 优先级：越大越优先，默认由 EngineManager 按此排序 */
  priority: number;
  /** 检测当前环境是否具备该引擎（如 chrome.ai API 存在 / WebGPU 可用） */
  isAvailable: () => Promise<boolean>;
  /** 是否支持某种模式（如翻译引擎不支持"扩写"） */
  supports: (mode: EngineMode) => boolean;
  /** 执行推理 */
  run: (input: EngineRunInput) => Promise<string>;
}
