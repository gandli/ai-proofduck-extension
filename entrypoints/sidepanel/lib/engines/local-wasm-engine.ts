import type { EngineProgress, ModeKey, Settings } from '../../../shared/contracts';

const WASM_MODEL_ID = 'Xenova/t5-small';

type Text2TextPipeline = Awaited<ReturnType<typeof createPipeline>>;

let cachedPipeline: Text2TextPipeline | null = null;

function buildPrompt(text: string, mode: ModeKey, settings: Settings) {
  switch (mode) {
    case 'translate':
      return `translate to ${settings.targetLanguage}: ${text}`;
    case 'summarize':
      return `summarize: ${text}`;
    case 'correct':
      return `fix grammar and spelling: ${text}`;
    case 'proofread':
      return `rewrite naturally and professionally: ${text}`;
    case 'expand':
      return `expand this into a fuller paragraph: ${text}`;
    default:
      return text;
  }
}

async function createPipeline() {
  const { pipeline } = await import('@huggingface/transformers');
  return pipeline('text2text-generation', WASM_MODEL_ID, {
    dtype: 'q8',
  });
}

async function getPipeline(onProgress?: (progress: EngineProgress) => void) {
  if (cachedPipeline) {
    return cachedPipeline;
  }

  onProgress?.({
    phase: 'loading',
    progress: 10,
    message: '正在加载本地 WASM 模型',
  });

  cachedPipeline = await createPipeline();
  return cachedPipeline;
}

export async function executeLocalWasm(input: {
  text: string;
  mode: ModeKey;
  settings: Settings;
  onProgress?: (progress: EngineProgress) => void;
}) {
  const generator = await getPipeline(input.onProgress);

  input.onProgress?.({
    phase: 'running',
    progress: 88,
    message: '本地 WASM 模型正在处理内容',
  });

  const output = await generator(buildPrompt(input.text, input.mode, input.settings), {
    max_new_tokens: input.mode === 'expand' ? 180 : 128,
  });

  const first = Array.isArray(output) ? output[0] : output;
  const normalized = first as { generated_text?: string; summary_text?: string; text?: string } | undefined;
  const result = [normalized?.generated_text, normalized?.summary_text, normalized?.text]
    .find((value) => typeof value === 'string' && value.trim().length > 0)
    ?.trim() ?? '';

  if (!result) {
    throw new Error('本地 WASM 模型没有返回结果');
  }

  input.onProgress?.({
    phase: 'done',
    progress: 100,
    message: '本地 WASM 模型已完成处理',
  });

  return {
    result,
    notice: `已使用本地 WASM 模型（${WASM_MODEL_ID}）`,
    runtime: 'wasm' as const,
  };
}
