// Re-export types
export type { TranslationResult, StreamChunk, TranslationEngine } from '../types';

// LLM API specific types (for adapter configurations)
export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// Export adapters
export { GoogleTranslateAdapter, googleTranslateAdapter } from './google';
export { OpenAIAdapter, openAIAdapter } from './openai';
export { ChromeAIAdapter, chromeAIAdapter } from './chrome-ai';
export { WebGPUAdapter, webGPUAdapter } from './webgpu';
export { WASMAdapter, wasmAdapter } from './wasm';

// Export LLM adapters
export { ClaudeAdapter, claudeAdapter } from './claude';
export { DeepSeekAdapter, deepSeekAdapter } from './deepseek';
export { QwenAdapter, qwenAdapter } from './qwen';
export { GeminiAdapter, geminiAdapter } from './gemini';

// Import adapters for LLM_ADAPTERS
import { openAIAdapter } from './openai';
import { claudeAdapter } from './claude';
import { deepSeekAdapter } from './deepseek';
import { qwenAdapter } from './qwen';
import { geminiAdapter } from './gemini';

// All available LLM adapters
export const LLM_ADAPTERS = {
  openai: openAIAdapter,
  claude: claudeAdapter,
  deepseek: deepSeekAdapter,
  qwen: qwenAdapter,
  gemini: geminiAdapter,
} as const;

export type LLMProvider = keyof typeof LLM_ADAPTERS;