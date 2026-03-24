export type ModeKey = 'translate' | 'summarize' | 'correct' | 'proofread' | 'expand';

export type EngineType = 'chrome-ai' | 'local' | 'online' | 'fallback';
export type EnginePreference = 'auto' | 'chrome-ai' | 'local' | 'online';
export type InputSource = 'manual' | 'selection' | 'page';

export interface Settings {
  targetLanguage: string;
  enginePreference: EnginePreference;
  localModel: string;
  localAllowWasmFallback: boolean;
  translationFallbackEnabled: boolean;
  onlineApiBase: string;
  onlineApiKey: string;
  onlineModel: string;
}

export interface EngineProgress {
  phase: 'idle' | 'checking' | 'downloading' | 'loading' | 'running' | 'done' | 'error';
  progress: number;
  message: string;
}

export interface RuntimeEngineState {
  preferredEngine: EnginePreference;
  actualEngine: EngineType | null;
  localRuntime: 'webgpu' | 'wasm' | null;
  message: string;
  fallbackUsed: boolean;
  progress?: EngineProgress;
}

export interface InputDraft {
  text: string;
  source: InputSource;
  pageTitle?: string;
  url?: string;
  capturedAt: string;
  preferredMode?: ModeKey;
  autoRun?: boolean;
  prefilledResult?: string;
  prefilledNotice?: string;
}

export interface SelectionTranslationPayload {
  draft: InputDraft;
  result: string;
  notice: string;
}

export interface ModeDefinition {
  key: ModeKey;
  label: string;
  description: string;
}

export const MODES: ModeDefinition[] = [
  { key: 'summarize', label: '摘要', description: '提炼当前文本的重点' },
  { key: 'correct', label: '校对', description: '修正拼写和基础错误' },
  { key: 'proofread', label: '润色', description: '让语句更自然、更顺' },
  { key: 'translate', label: '翻译', description: '把文本转换成目标语言' },
  { key: 'expand', label: '扩写', description: '把简短内容扩展成完整表达' },
];

export const DEFAULT_SETTINGS: Settings = {
  targetLanguage: '中文',
  enginePreference: 'auto',
  localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  localAllowWasmFallback: true,
  translationFallbackEnabled: true,
  onlineApiBase: '',
  onlineApiKey: '',
  onlineModel: '',
};

export const STORAGE_KEYS = {
  settings: 'proofduck:settings',
  inputDraft: 'proofduck:input-draft',
  selectionTranslation: 'proofduck:selection-translation',
} as const;

export const RUNTIME_MESSAGES = {
  queueDraft: 'proofduck:queue-draft',
  getSelection: 'proofduck:get-selection',
  getPageText: 'proofduck:get-page-text',
  translateSelection: 'proofduck:translate-selection',
  offscreenTranslate: 'proofduck:offscreen-translate',
  ensureOffscreenHost: 'proofduck:ensure-offscreen-host',
  syncSelectionTranslation: 'proofduck:sync-selection-translation',
  selectionTranslationUpdated: 'proofduck:selection-translation-updated',
} as const;
