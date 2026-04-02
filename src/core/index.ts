// Core functionality will be implemented in M2
export interface EngineState {
  currentEngine: string;
  status: 'idle' | 'translating' | 'error';
  error?: string;
  fallbackEngines: string[];
}

export interface ServiceConfig {
  enabled: boolean;
  priority: number;
  status: 'available' | 'loading' | 'unavailable';
}