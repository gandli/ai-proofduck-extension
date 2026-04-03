/**
 * Core 模块 - 引擎核心管理
 */

// Engine state type
export interface EngineState {
  currentEngine: string;
  status: 'idle' | 'translating' | 'error';
  error?: string;
  fallbackEngines: string[];
}

// Service configuration type
export interface ServiceConfig {
  enabled: boolean;
  priority: number;
  status: 'available' | 'loading' | 'unavailable';
}

// Re-export
export { EngineManager, EngineError, getEngineManager, createEngineManager } from './EngineManager';
export type { TranslationEngine } from '@/types';