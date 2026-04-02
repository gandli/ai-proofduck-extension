/**
 * ProofDuck 类型定义
 */

/**
 * AI 操作模式
 */
export type AIMode = 'translate' | 'proofread' | 'polish' | 'expand';

/**
 * 翻译结果
 */
export interface TranslationResult {
  translatedText: string;
  engine: string;
  detectedLanguage?: string;
  duration?: number;
}

/**
 * 校对修正
 */
export interface Correction {
  original: string;
  corrected: string;
  message?: string;
}

/**
 * 校对结果
 */
export interface ProofreadResult {
  correctedText: string;
  corrections: Correction[];
  engine: string;
  duration?: number;
}

/**
 * 内容脚本到后台的消息类型
 */
export interface ContentToBackgroundMessage {
  type: 'translate' | 'proofread' | 'polish' | 'expand' | 'translatePage';
  text: string;
  mode?: AIMode;
}

/**
 * 后台到内容脚本的响应类型
 */
export interface BackgroundToContentMessage {
  type: 'translationResult' | 'proofreadResult' | 'error';
  originalText: string;
  result: TranslationResult | ProofreadResult;
  error?: string;
}

/**
 * 全文翻译请求
 */
export interface FullPageTranslationRequest {
  sourceLang: string;
  targetLang: string;
  bilingualMode: boolean;
}

/**
 * 全文翻译进度
 */
export interface FullPageTranslationProgress {
  current: number;
  total: number;
  currentText: string;
}

/**
 * 翻译引擎接口
 */
export interface TranslationEngine {
  readonly id: string;
  readonly name: string;
  readonly category: 'translation' | 'local' | 'llm';
  readonly priority: number;

  checkAvailability(): Promise<boolean>;
  translate(text: string, from: string, to: string): Promise<TranslationResult>;
  stream?(text: string, from: string, to: string): AsyncGenerator<string>;
}

/**
 * 引擎状态
 */
export type EngineStatus = 'idle' | 'translating' | 'error' | 'ready';

/**
 * 引擎信息
 */
export interface EngineInfo {
  id: string;
  name: string;
  status: EngineStatus;
  error?: string;
}

/**
 * 引擎配置
 */
export interface EngineConfig {
  enabled: boolean;
  priority: number;
  apiKey?: string;
}
