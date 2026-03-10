// ============================================================
// Shared types for AI Proofduck sidepanel
// ============================================================

/** The five processing modes */
export type ModeKey = 'summarize' | 'correct' | 'proofread' | 'translate' | 'expand';

/** Translation fallback provider options */
export type TranslateFallbackProvider = 'none' | 'google-free' | 'mymemory';

/** Engine type options */
export type EngineType = 'local-gpu' | 'local-wasm' | 'online' | 'chrome-ai';

/** Persisted user settings */
export interface Settings {
  engine: EngineType;
  extensionLanguage: string;
  tone: string;
  detailLevel: string;
  localModel: string;
  apiBaseUrl: string;
  apiKey: string;
  apiModel: string;
  autoSpeak: boolean;
  translateFallback?: TranslateFallbackProvider;
  readyConfigs?: string[]; // track "ready" local model keys, e.g. ["local-gpu:Qwen2.5-0.5B"]
  failedConfigs?: string[]; // track "failed" local model keys
}

/** Default settings factory */
export const DEFAULT_SETTINGS: Settings = {
  engine: 'local-gpu',
  extensionLanguage: '中文',
  tone: 'professional',
  detailLevel: 'standard',
  localModel: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  apiModel: 'gpt-3.5-turbo',
  autoSpeak: false,
  translateFallback: 'google-free',
  readyConfigs: [],
  failedConfigs: [],
};

/** Empty mode results record helper */
export function emptyModeResults(): Record<ModeKey, string> {
  return { summarize: '', correct: '', proofread: '', translate: '', expand: '' };
}

export function emptyGeneratingModes(): Record<ModeKey, boolean> {
  return { summarize: false, correct: false, proofread: false, translate: false, expand: false };
}

// ---- Worker message protocol (discriminated union) ----

export interface WorkerLoadMessage {
  type: 'load';
  settings: Settings;
}

export interface WorkerGenerateMessage {
  type: 'generate';
  text: string;
  mode: ModeKey;
  settings: Settings;
  requestId?: string;
}

export interface WorkerResetMessage {
  type: 'reset';
}

export type WorkerInboundMessage = WorkerLoadMessage | WorkerGenerateMessage | WorkerResetMessage;

export interface WorkerProgressMessage {
  type: 'progress';
  progress: { progress: number; text: string };
}

export interface WorkerReadyMessage {
  type: 'ready';
}

export interface WorkerUpdateMessage {
  type: 'update';
  text: string;
  mode: ModeKey;
  requestId?: string;
}

export interface WorkerCompleteMessage {
  type: 'complete';
  text: string;
  mode: ModeKey;
  requestId?: string;
}

export interface WorkerErrorMessage {
  type: 'error';
  error: string;
  mode?: ModeKey;
  requestId?: string;
}

export type WorkerOutboundMessage =
  | WorkerProgressMessage
  | WorkerReadyMessage
  | WorkerUpdateMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage;

// ---- Mode definition for array-driven rendering ----

export interface ModeDefinition {
  key: ModeKey;
  labelKey: string;          // key into translations, e.g. 'mode_summarize'
  resultLabelKey: string;    // e.g. 'result_summarize'
}

export const MODES: ModeDefinition[] = [
  { key: 'translate', labelKey: 'mode_translate', resultLabelKey: 'result_translate' },
  { key: 'summarize', labelKey: 'mode_summarize', resultLabelKey: 'result_summarize' },
  { key: 'correct', labelKey: 'mode_correct', resultLabelKey: 'result_correct' },
  { key: 'proofread', labelKey: 'mode_proofread', resultLabelKey: 'result_proofread' },
  { key: 'expand', labelKey: 'mode_expand', resultLabelKey: 'result_expand' },
];

// ---- Chrome AI Types ----

export interface ChromeAIModelCapabilities {
  available: 'no' | 'after-download' | 'readily';
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export interface ChromeAISession {
  promptStreaming(input: string): Promise<ReadableStream<string> | AsyncIterable<string>>;
  destroy(): Promise<void>;
}

export interface ChromeAIModelAPI {
  capabilities(): Promise<ChromeAIModelCapabilities>;
  create(options: { systemPrompt: string }): Promise<ChromeAISession>;
}

export interface ChromeAI {
  languageModel?: ChromeAIModelAPI;
  capabilities?(): Promise<ChromeAIModelCapabilities>;
}

// ---- Progress and Status Types ----

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ProgressInfo {
  progress: number;
  text: string;
}

// ---- Message Types for Browser Communication ----

export interface PageContentMessage {
  type: 'GET_PAGE_CONTENT';
}

export interface PageContentResponse {
  content?: string;
}

export interface QuickTranslateMessage {
  type: 'QUICK_TRANSLATE';
  text?: string;
}

export interface QuickTranslateResponse {
  translatedText?: string;
  error?: string;
}

export interface OpenSidePanelMessage {
  type: 'OPEN_SIDE_PANEL';
}

export interface InitEngineMessage {
  type: 'INIT_ENGINE';
  settings: Settings;
}

export interface GenerateMessage {
  type: 'GENERATE';
  text: string;
  mode: ModeKey;
  settings: Settings;
}

export interface ResetEngineMessage {
  type: 'RESET_ENGINE';
}

export interface WorkerUpdateBridgeMessage {
  type: 'WORKER_UPDATE';
  data: WorkerOutboundMessage;
}
