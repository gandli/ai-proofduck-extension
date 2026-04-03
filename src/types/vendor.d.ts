/**
 * @huggingface/transformers 模块类型声明
 */

declare module '@huggingface/transformers' {
  interface TransformersEnv {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
    wasmProxy?: boolean;
    disableCache?: boolean;
  }

  interface Pipeline {
    (task: string, model?: string, options?: PipelineOptions): Promise<PipelineRunResult>;
  }

  interface PipelineOptions {
    device?: 'cpu' | 'wasm' | 'webgpu' | 'cuda';
    quantized?: boolean;
    dtype?: 'q8' | 'q4' | 'q2' | 'fp16' | 'fp32';
    src_lang?: string;
    tgt_lang?: string;
  }

  interface PipelineRunResult {
    (input: string, options?: Record<string, unknown>): Promise<Array<{ translation_text: string }>>;
  }

  const pipeline: Pipeline;
  const env: TransformersEnv;

  export { pipeline, env };
  export default { pipeline, env };
}

/**
 * @mlc-ai/web-llm 模块类型声明
 */

declare module '@mlc-ai/web-llm' {
  interface WebLLMModule {
    CreateChatModule(options: CreateChatModuleOptions): Promise<WebLLMChat>;
  }

  interface CreateChatModuleOptions {
    model: string;
    device?: 'webgpu' | 'cpu';
  }

  interface WebLLMChat {
    expressCurrentGeneratedText(): string;
    prefill(prompt: string): Promise<void>;
    generate(prompt: string, config?: GenerationConfig): Promise<string>;
    resetChat(): void;
    unload(): void;
  }

  interface GenerationConfig {
    temperature?: number;
    max_tokens?: number;
    stop?: string[];
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  }

  export { WebLLMModule, WebLLMChat, CreateChatModuleOptions, GenerationConfig };
  export const CreateChatModule: (options: CreateChatModuleOptions) => Promise<WebLLMChat>;
}
