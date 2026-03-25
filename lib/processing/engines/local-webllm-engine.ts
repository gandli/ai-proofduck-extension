import type { EngineProgress, ModeKey, Settings } from '../../../entrypoints/shared/contracts';
import { processText } from '../processText';
import { detectLocalRuntime } from './local-runtime';
import { executeLocalWasm } from './local-wasm-engine';
import { buildMessageList, extractAssistantText } from './prompting';

interface LocalExecutionInput {
  text: string;
  mode: ModeKey;
  settings: Settings;
  onProgress?: (progress: EngineProgress) => void;
}

let cachedModelId: string | null = null;
let cachedEngine: Awaited<ReturnType<typeof createEngine>> | null = null;
let cachedWorker: Worker | null = null;

function getWorker() {
  if (!cachedWorker) {
    cachedWorker = new Worker(new URL('../../../entrypoints/sidepanel/worker.ts', import.meta.url), { type: 'module' });
  }

  return cachedWorker;
}

async function createEngine(modelId: string, onProgress?: (progress: EngineProgress) => void) {
  const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
  const worker = getWorker();

  return CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback(report) {
      const text = typeof report.text === 'string' ? report.text : '正在加载本地模型';
      const ratio = typeof report.progress === 'number' ? Math.round(report.progress * 100) : 35;
      onProgress?.({
        phase: report.progress === 1 ? 'done' : 'downloading',
        progress: ratio,
        message: text,
      });
    },
  });
}

async function getWebLlmEngine(modelId: string, onProgress?: (progress: EngineProgress) => void) {
  if (cachedEngine && cachedModelId === modelId) {
    return cachedEngine;
  }

  onProgress?.({
    phase: 'loading',
    progress: 10,
    message: '正在初始化本地模型',
  });

  cachedEngine = await createEngine(modelId, onProgress);
  cachedModelId = modelId;

  return cachedEngine;
}

export async function executeLocalWebLlm(input: LocalExecutionInput) {
  const runtime = detectLocalRuntime(input.settings);

  if (!runtime) {
    throw new Error('当前环境既不支持 WebGPU，也没有开启轻量 WASM 回退');
  }

  if (runtime === 'wasm') {
    try {
      return await executeLocalWasm(input);
    } catch {
      input.onProgress?.({
        phase: 'running',
        progress: 100,
        message: '本地 WASM 模型暂时不可用，已切到兼容兜底模式',
      });

      return {
        result: processText(input.text, input.mode, input.settings, 'local'),
        notice: '本地 WASM 模型暂时不可用，已切到兼容兜底模式',
        runtime,
      };
    }
  }

  const engine = await getWebLlmEngine(input.settings.localModel, input.onProgress);
  input.onProgress?.({
    phase: 'running',
    progress: 90,
    message: '本地 WebGPU 模型正在处理内容',
  });

  const completion = await engine.chat.completions.create({
    messages: buildMessageList(input.text, input.mode, input.settings) as never,
    temperature: input.mode === 'translate' ? 0 : 0.3,
  });
  const result = extractAssistantText(completion);

  if (!result) {
    throw new Error('本地模型没有返回结果');
  }

  input.onProgress?.({
    phase: 'done',
    progress: 100,
    message: '本地模型已完成处理',
  });

  return {
    result,
    notice: '已使用本地 WebGPU 模型',
    runtime,
  };
}
