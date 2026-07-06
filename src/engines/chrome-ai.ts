/**
 * chrome-ai 引擎：Chrome 138+ 内置 Translator API（Gemini Nano 语言包）
 *
 * 为什么选官方 Translator API？
 * - 有专门的翻译语言包（比 Prompt "帮我翻译" 精准得多）
 * - 支持流式（translateStreaming）
 * - 100% 本地推理，符合隐私优先
 *
 * 可用性判定链：
 *   Translator 全局不存在 → 不可用（浏览器不支持）
 *   Translator.availability({sourceLanguage, targetLanguage}) 返回:
 *     - 'available'    → 可用（模型已就位）
 *     - 'downloadable' → 可用（首次使用会下载语言包）
 *     - 'downloading'  → 可用（正在下载）
 *     - 'unavailable'  → 不可用（此语言对不支持）
 *
 * 缓存策略：
 *   translator 实例按 "source-target" 组合 key 缓存，避免同一对语言反复 create。
 */
import { formatErrorMessage } from '../utils/error';
import type { Engine, EngineMode, EngineRunInput } from './types';

// Chrome 内置 Translator API 的最小类型定义（避免全依赖 @types/dom-chromium-ai）
type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
interface TranslatorInstance {
  translate(text: string): Promise<string>;
  translateStreaming(text: string): AsyncIterable<string>;
}
interface TranslatorStatic {
  availability(opts?: { sourceLanguage?: string; targetLanguage?: string }): Promise<Availability>;
  create(opts: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorInstance>;
}

function getTranslatorGlobal(): TranslatorStatic | undefined {
  return (globalThis as unknown as { Translator?: TranslatorStatic }).Translator;
}

export interface ChromeAiEngine extends Engine {
  translate(text: string, opts: { source: string; target: string }): Promise<string>;
  translateStreaming(text: string, opts: { source: string; target: string }): AsyncIterable<string>;
}

/** chrome-ai 引擎目前只支持 translate（M2 Cycle 1 范围） */
const SUPPORTED_MODES: readonly EngineMode[] = ['translate'];

/** 从 EngineRunInput 抽出源/目标语言，未提供时给合理默认（en↔zh） */
function pickLangs(input: EngineRunInput): { source: string; target: string } {
  const target = input.targetLang ?? 'zh';
  // 若未指定 source，就假设与 target 相反的常见对：en↔zh
  const source = input.sourceLang ?? (target === 'zh' ? 'en' : 'zh');
  return { source, target };
}

export function createChromeAiEngine(): ChromeAiEngine {
  // key = `${source}->${target}` → 缓存的 translator 实例
  const cache = new Map<string, Promise<TranslatorInstance>>();

  async function getTranslator(source: string, target: string): Promise<TranslatorInstance> {
    const T = getTranslatorGlobal();
    if (!T) throw new Error('Translator API 不可用');
    const key = `${source}->${target}`;
    let p = cache.get(key);
    if (!p) {
      p = T.create({ sourceLanguage: source, targetLanguage: target });
      cache.set(key, p);
      // 失败的 Promise 从缓存移除，避免"一次失败永远失败"（Gemini review 建议）
      // 场景：语言包下载失败、网络异常、availability 从 downloadable 变 unavailable
      p.catch(() => {
        cache.delete(key);
      });
    }
    return p;
  }

  return {
    id: 'chrome-ai',
    name: 'Chrome 内置 AI',
    // 优先级 100：本地推理 + 官方 API，M2 里排最前
    priority: 100,

    async isAvailable() {
      const T = getTranslatorGlobal();
      if (!T) return false;
      try {
        const av = await T.availability();
        return av !== 'unavailable';
      } catch {
        return false;
      }
    },

    supports(mode) {
      return SUPPORTED_MODES.includes(mode);
    },

    async run(input) {
      if (!this.supports(input.mode)) {
        throw new Error(`chrome-ai 暂不支持 ${input.mode}（M2 Cycle 1 只有 translate）`);
      }
      const { source, target } = pickLangs(input);
      return this.translate(input.text, { source, target });
    },

    async *runStreaming(input) {
      if (!this.supports(input.mode)) {
        throw new Error(`chrome-ai 暂不支持 ${input.mode}`);
      }
      const { source, target } = pickLangs(input);
      yield* this.translateStreaming(input.text, { source, target });
    },

    async translate(text, { source, target }) {
      const t = await getTranslator(source, target);
      return t.translate(text);
    },

    translateStreaming(text, { source, target }) {
      // 惰性生成器：await getTranslator 后再开始拉流
      async function* generator() {
        const t = await getTranslator(source, target);
        for await (const chunk of t.translateStreaming(text)) {
          yield chunk;
        }
      }
      return generator();
    },
  };
}
