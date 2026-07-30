/**
 * Gemini 引擎：Google Gemini API native 接入
 *
 * API: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * Key: google AI Studio API key，存 chrome.storage.local
 *
 * 定位：
 * - 云端 LLM，free tier 可用 (60 req/min)
 * - 优先级 80：高于 BYOK openai-compat，低于本地 webllm
 * - 支持全 5 种模式
 */
import type { Engine, EngineMode, EngineRunInput } from './types';
import { createFetchAbortHandle } from '@utils/fetch-abort';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';

interface GeminiConfig {
  apiKey: string;
  model: string;
}

function systemPromptFor(input: EngineRunInput): string {
  switch (input.mode) {
    case 'translate': {
      const src = input.sourceLang ?? 'auto';
      const tgt = input.targetLang ?? 'zh';
      return `You are a professional translator. Translate from ${src} to ${tgt}. Output ONLY the translation.`;
    }
    case 'summarize':
      return '你是一名编辑，请对文本做简洁准确的摘要，只输出摘要正文。';
    case 'correct':
      return '你是一名中文校对专家，找出错别字、语病、标点错误，输出改正后的版本。只输出改正后的正文。';
    case 'polish':
      return '你是一名文字润色专家，让文本更地道、更流畅、保留原意。只输出润色后的正文。';
    case 'expand':
      return '你是一名内容扩写助手，将短文本自然扩展成更丰富的段落。只输出扩写后的正文。';
  }
}

function buildContents(input: EngineRunInput) {
  const parts: { text: string }[] = [{ text: input.text }];
  const sys = systemPromptFor(input);
  // Gemini system instruction via contents[0].role='user' with system prefix
  return [
    { role: 'user' as const, parts: [{ text: `${sys}\n\n---\n${input.text}` }] },
  ];
}

export function createGeminiEngine(): Engine {
  let model = DEFAULT_MODEL;
  let configLoaded = false;

  const getConfig = async (): Promise<GeminiConfig> => {
    if (!configLoaded) {
      try {
        const stored = await chrome.storage.local.get('geminiConfig');
        if (stored.geminiConfig) {
          const cfg = stored.geminiConfig as GeminiConfig;
          model = cfg.model || DEFAULT_MODEL;
        }
      } catch { /* chrome.storage not available in content script */ }
      configLoaded = true;
    }
    return { apiKey: 'runtime-loaded', model };
  };

  const engine: Engine = {
    id: 'gemini',
    name: 'Gemini',
    model: DEFAULT_MODEL,
    priority: 80,

    isAvailable: async () => {
      try {
        const stored = await chrome.storage.local.get('geminiConfig');
        const cfg = stored.geminiConfig as GeminiConfig | undefined;
        return Boolean(cfg?.apiKey);
      } catch {
        return false;
      }
    },

    supports: (_mode: EngineMode) => true,

    run: async (input: EngineRunInput): Promise<string> => {
      const cfg = await getConfig();
      const abort = createFetchAbortHandle(input.signal, 60_000);
      try {
        const url = `${BASE}/${model}:generateContent?key=${cfg.apiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          signal: abort.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: buildContents(input),
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: input.maxTokens ?? 2048,
            },
          }),
        });
        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          throw new Error(`Gemini HTTP ${resp.status} ${body.slice(0, 200)}`);
        }
        const data = await resp.json() as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return text;
      } finally {
        abort.cleanup();
      }
    },
  };

  return engine;
}
