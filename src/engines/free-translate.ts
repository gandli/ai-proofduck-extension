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
import { createFetchAbortHandle } from '@utils/fetch-abort';
import { sanitizeSecrets } from '@utils/error';

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
  const chunks = json[0];
  return chunks
    .map((chunk) => {
      if (!Array.isArray(chunk)) return '';
      const text: unknown = chunk[0];
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
      // targetLang 在 EngineRunInput 上是可选的（其他 mode 未必需要），
      // 但对翻译来说必填。否则会拼出 tl=undefined 让 Google 端点 400。
      // Gemini review 提出。
      if (!targetLang) {
        throw new Error('free-translate: 缺少目标语言参数 targetLang');
      }

      // dt=t 只要翻译文本；client=gtx 是公开可用的 Chrome 翻译扩展 client id
      const url =
        `${ENDPOINT}?client=gtx&sl=${sourceLang}&tl=${targetLang}` +
        `&dt=t&q=${encodeURIComponent(text)}`;

      const abortH = createFetchAbortHandle(input.signal);
      try {
        const resp = await fetch(url, { signal: abortH.signal });
        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          // free-translate 是无鉴权公开端点，body 里理论上不会有 apiKey；
          // v0.5.5 P1-A（审计 v3）：即便如此也走 sanitizeSecrets（防御性一致），
          // 且必须先脱敏再切片——否则 secret 若恰好跨 200 字节边界会被切成
          // < 20 char 前缀，绕过 SECRET_PATTERNS 的 {20,} 长度约束导致明文泄漏。
          // v0.5.6 P1-B（审计 v5）：先切 1000 char 缓冲区再脱敏，避免大 body
          // （Google 翻译异常时可能返回长 HTML）阻塞主线程。1000 » 200 保证边界安全。
          throw new Error(
            `free-translate HTTP ${resp.status}: ${sanitizeSecrets(body.slice(0, 1000)).slice(0, 200)}`,
          );
        }

        const json: unknown = await resp.json();
        return parseGoogleResponse(json);
      } finally {
        abortH.cleanup();
      }
    },

    // 不实现 runStreaming——免费端点不支持流式
    // useTranslate 会自动降级到 run()
  };
}
