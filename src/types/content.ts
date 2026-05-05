/**
 * Content Script 类型定义
 */

import type { AIMode, TranslationResult, ProofreadResult } from '../types';

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
 * 选区信息
 */
export interface SelectionInfo {
  text: string;
  startOffset: number;
  endOffset: number;
  context?: string;
}

/**
 * 文本位置信息
 */
export interface TextPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}
