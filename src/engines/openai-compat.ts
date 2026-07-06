/**
 * openai-compat 引擎：兼容 OpenAI /v1/chat/completions 协议的通用云端引擎
 *
 * 生态覆盖：
 * - OpenAI（gpt-4o-mini 等）
 * - DeepSeek（deepseek-chat / deepseek-reasoner）
 * - 阿里通义（qwen-turbo / qwen-plus）
 * - 火山方舟豆包
 * - 智谱（glm-4）
 * - 用户自建 Ollama / vLLM / Xinference / LM Studio（本地也走这个）
 *
 * 定位：
 * - 用户 BYOK 云端 / 自建服务的统一入口
 * - 支持全 5 种模式
 * - 优先级 70：低于本地引擎（chrome-ai/webllm）但高于免费兜底
 *
 * 隐私边界：
 * - baseUrl / model 存 sync，可以跨设备
 * - apiKey 只存 local（openai-compat-config.ts 里硬约束）
 * - 不在日志里打印 key
 */
import type { Engine, EngineMode, EngineRunInput } from './types';
import { openaiCompatConfig } from '@core/openai-compat-config';

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

function buildMessages(input: EngineRunInput) {
  return [
    { role: 'system' as const, content: systemPromptFor(input) },
    { role: 'user' as const, content: input.text },
  ];
}

/** 拼 URL：处理 trailing slash，避免 `//v1/chat/completions` */
function joinUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, '') + path;
}

export function createOpenAiCompatEngine(): Engine {
  async function requireConfig() {
    const cfg = await openaiCompatConfig.get();
    if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
      throw new Error('openai-compat 未配置：请在设置页填写 baseUrl / apiKey / model');
    }
    return cfg;
  }

  return {
    id: 'openai-compat',
    name: 'OpenAI 兼容 · 云端 / 自建（BYOK）',
    priority: 70,

    async isAvailable(): Promise<boolean> {
      const { baseUrl, apiKey, model } = await openaiCompatConfig.get();
      return Boolean(baseUrl && apiKey && model);
    },

    supports(_mode: EngineMode): boolean {
      return true;
    },

    async run(input: EngineRunInput): Promise<string> {
      const cfg = await requireConfig();
      const resp = await fetch(joinUrl(cfg.baseUrl, '/v1/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: buildMessages(input),
          temperature: 0.3,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`openai-compat HTTP ${resp.status}: ${text.slice(0, 200)}`);
      }
      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('openai-compat 响应结构异常：未取到 choices[0].message.content');
      }
      return content;
    },

    async *runStreaming(input: EngineRunInput): AsyncIterable<string> {
      const cfg = await requireConfig();
      const resp = await fetch(joinUrl(cfg.baseUrl, '/v1/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: buildMessages(input),
          temperature: 0.3,
          stream: true,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`openai-compat HTTP ${resp.status}: ${text.slice(0, 200)}`);
      }
      if (!resp.body) {
        throw new Error('openai-compat 响应缺少 body（SSE 不可读）');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // SSE 格式：一条事件由若干 `field: value` 行组成，事件之间空行分隔。
      // 网络层会随意切分字节 → 必须 buffer + 找 \n\n 分隔符。
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // 事件边界：`\n\n`
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          // 每个事件里找 `data: ...` 行（可多行拼接，标准 SSE 允许）
          const dataLines = rawEvent
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trimStart());
          if (dataLines.length === 0) continue;

          const payload = dataLines.join('\n');
          if (payload === '[DONE]') return;

          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // 解析失败就跳过这个事件，不让脏数据崩掉整个流
          }
        }
      }
    },
  };
}
