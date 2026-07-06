/**
 * webllm 引擎：浏览器内 LLM 推理兜底（WebGPU）
 *
 * 定位：
 * - Chrome AI 不可用时的第二兜底
 * - 通用 LLM，一石五鸟：translate/summarize/correct/polish/expand 全能
 * - 中文优化：默认 Qwen2.5-1.5B-Instruct（950MB，中文原生训练）
 *
 * 权衡：
 * - 优点：完全本地、隐私、离线可用、支持全模式
 * - 缺点：首次下载 950MB；需要 WebGPU；1.5B 质量低于 Chrome AI 的专门翻译模型
 *
 * 优先级 90（低于 chrome-ai 的 100）。
 *
 * 惰性初始化：首次 run 才 CreateMLCEngine（下载 + 编译 shader ~30s），
 * 之后复用同一实例。
 */
import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm';
import type { Engine, EngineMode, EngineRunInput } from './types';

const DEFAULT_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

/** 按 mode 拼系统 prompt。翻译带语言参数，其他任务纯中文指令。 */
function systemPromptFor(input: EngineRunInput): string {
  switch (input.mode) {
    case 'translate': {
      const src = input.sourceLang ?? 'auto';
      const tgt = input.targetLang ?? 'zh';
      return `You are a professional translator. Translate the user's text from ${src} to ${tgt}. Output ONLY the translation, no explanation, no quotes, no source text.`;
    }
    case 'summarize':
      return '你是一名擅长中文写作的编辑。请对用户提供的文本做简洁准确的摘要，只输出摘要正文，不要加任何前缀标签。';
    case 'correct':
      return '你是一名中文校对专家。请找出用户文本里的错别字、语病、标点错误，并输出改正后的版本。只输出改正后的正文。';
    case 'polish':
      return '你是一名文字润色专家。请让用户的文本更地道、更流畅、更有表现力，保留原意。只输出润色后的正文。';
    case 'expand':
      return '你是一名内容扩写助手。请将用户的短文本自然扩展成更丰富的段落，保留原意。只输出扩写后的正文。';
  }
}

export function createWebLlmEngine(modelId: string = DEFAULT_MODEL): Engine {
  let enginePromise: Promise<MLCEngine> | null = null;

  /** 惰性拿 MLCEngine 实例。失败时清缓存，支持重试。 */
  function getEngine(): Promise<MLCEngine> {
    if (!enginePromise) {
      enginePromise = CreateMLCEngine(modelId);
      enginePromise.catch(() => {
        enginePromise = null; // 失败可重试（同 chrome-ai 那次 Gemini 反馈教训）
      });
    }
    return enginePromise;
  }

  const buildMessages = (input: EngineRunInput) => [
    { role: 'system' as const, content: systemPromptFor(input) },
    { role: 'user' as const, content: input.text },
  ];

  return {
    id: 'webllm',
    name: 'WebLLM · Qwen2.5-1.5B（本地推理）',
    priority: 90,

    async isAvailable(): Promise<boolean> {
      const gpu = (globalThis as { navigator?: { gpu?: { requestAdapter: () => Promise<unknown> } } }).navigator?.gpu;
      if (!gpu?.requestAdapter) return false;
      try {
        const adapter = await gpu.requestAdapter();
        return adapter !== null && adapter !== undefined;
      } catch {
        return false;
      }
    },

    supports(_mode: EngineMode): boolean {
      // 全模式支持
      return true;
    },

    async run(input: EngineRunInput): Promise<string> {
      const engine = await getEngine();
      const resp = await engine.chat.completions.create({
        messages: buildMessages(input),
        temperature: 0.3, // 翻译/校对偏保守，润色/扩写可以由未来 UI 调
      });
      // web-llm 的响应结构与 OpenAI 完全一致
      return resp.choices[0]?.message?.content ?? '';
    },

    async *runStreaming(input: EngineRunInput): AsyncIterable<string> {
      const engine = await getEngine();
      const stream = await engine.chat.completions.create({
        messages: buildMessages(input),
        stream: true,
        temperature: 0.3,
      });
      // web-llm 的 stream 是 AsyncIterable<ChunkResponse>
      for await (const chunk of stream as AsyncIterable<{ choices: Array<{ delta: { content?: string } }> }>) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    },
  };
}
