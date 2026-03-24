import { STORAGE_KEYS, type EngineType } from '../../entrypoints/shared/contracts';

export interface StoredTestEngineOverride {
  engine: EngineType;
  result: string;
  notice: string;
  localRuntime: 'webgpu' | 'wasm' | null;
  fallbackUsed: boolean;
}

export async function readStoredTestEngineOverride(engine: EngineType) {
  const scoped = globalThis as typeof globalThis & {
    browser?: {
      storage?: {
        local?: {
          get: (key: string) => Promise<Record<string, unknown>>;
        };
      };
    };
  };

  const storage = scoped.browser?.storage?.local;
  if (!storage?.get) {
    return null;
  }

  try {
    const result = await storage.get(STORAGE_KEYS.testEngineOverride);
    const override = result[STORAGE_KEYS.testEngineOverride] as StoredTestEngineOverride | undefined;
    if (!override || override.engine !== engine) {
      return null;
    }

    return override;
  } catch {
    return null;
  }
}
