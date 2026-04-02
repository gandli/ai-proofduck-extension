/**
 * Core 模块 - 引擎核心管理
 */

// Re-export types
export type { EngineState, ServiceConfig } from '@/types';

export { EngineManager, EngineError, getEngineManager, createEngineManager } from './EngineManager';