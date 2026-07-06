/**
 * free-translate: 免费公开翻译服务兜底引擎
 *
 * 定位：**用户装完扩展就能用**的终极兜底。前面 chrome-ai / webllm /
 * openai-compat 全部不可用时（Chrome 老版本、无 WebGPU、没配 API key），
 * 这个引擎让扩展不至于"装了没用"。
 *
 * 端点：Google 翻译公开的 `translate_a/single`
 *   - 无需 API key（`client=gtx` 是 Chrome 翻译扩展自带的 client id，公开可用十多年）
 *   - 仅 GET 请求，直接走浏览器 fetch（CORS 友好）
 *   - 中文翻译质量顶级（专业模型 + 十几年数据）
 *
 * 隐私说明：
 *   ⚠️ 会把用户翻译的文本发送到 Google 服务器。这与 chrome-ai / webllm 的
 *   完全本地不同。因此：
 *   - 优先级 60（低于 openai-compat 70，让 BYOK 用户先走自己端点）
 *   - Options 页给用户开关（`freeTranslate.enabled`，默认 true）
 *   - 用户可以关掉以完全禁用联网兜底
 *
 * 能力限制：
 *   - 只做 translate，不做 summarize/correct/polish/expand（免费端点没能力）
 *   - 无流式（GET 一次拿全）
 */
import type { Engine, EngineMode } from './types';
import { defineStorage } from '@core/storage';

const enabledItem = defineStorage<boolean>('freeTranslate.enabled', true, { area: 'sync' });

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

/**
 * 解析 Google 翻译响应
 *
 * 响应结构（简化）：
 *   [
 *     [
 *       ["译文块1", "原文块1", null, null, 10],
 *       ["译文块2", "原文块2", null, null, 10],
 *       [null, null, "pronunciation", ...]  ← 偶尔穿插 null 项
 *     ],
 *     null,
 *     "en"  ← 检测到的源语言
 *   ]
 */
function parseGoogleResponse(json: unknown): string {
  if (!Array.isArray(json) || !Array.isArray(json[0])) {
    throw new Error('free-translate: 响应格式无法识别');
  }
  const chunks = json[0] as unknown[];
  return chunks
    .map((chunk) => {
      if (!Array.isArray(chunk)) return '';
      const text = chunk[0];
      return typeof text === 'string' ? text : '';
    })
    .join('');
}

export function createFreeTranslateEngine(): Engine {
  return {
    id: 'free-translate',
    name: '免费翻译（Google 公开端点）',
    priority: 60,

    supports(mode: EngineMode): boolean {
      return mode === 'translate';
    },

    async isAvailable(): Promise<boolean> {
      // 只要用户没关就认为可用（真正联网失败会在 run 时抛出，由 EngineManager 处理）
      // 不做主动 ping，避免每次 UI 挂载都发一次流量
      return enabledItem.get();
    },

    async run(input): Promise<string> {
      if (input.mode !== 'translate') {
        throw new Error(`free-translate: 仅支持 translate 模式，收到 ${input.mode}`);
      }

      const text = input.text.trim();
      if (!text) return '';

      const sourceLang = input.sourceLang || 'auto';
      const targetLang = input.targetLang;

      // dt=t 只要翻译文本；client=gtx 是公开可用的 Chrome 翻译扩展 client id
      const url =
        `${ENDPOINT}?client=gtx&sl=${sourceLang}&tl=${targetLang}` +
        `&dt=t&q=${encodeURIComponent(text)}`;

      const resp = await fetch(url);
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`free-translate: HTTP ${resp.status} ${body}`);
      }

      const json: unknown = await resp.json();
      return parseGoogleResponse(json);
    },

    // 不实现 runStreaming——免费端点不支持流式
    // useTranslate 会自动降级到 run()
  };
}
