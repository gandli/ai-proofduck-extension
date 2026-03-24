import type { Settings } from '../../../entrypoints/shared/contracts';

export function hasWebGpu() {
  const scoped = globalThis as typeof globalThis & {
    navigator?: Navigator & { gpu?: unknown; userAgent?: string };
  };

  const userAgent = scoped.navigator?.userAgent ?? '';
  if (userAgent.includes('HeadlessChrome')) {
    return false;
  }

  return Boolean(scoped.navigator?.gpu);
}

export function detectLocalRuntime(settings: Pick<Settings, 'localAllowWasmFallback'>) {
  if (hasWebGpu()) {
    return 'webgpu' as const;
  }

  if (settings.localAllowWasmFallback) {
    return 'wasm' as const;
  }

  return null;
}
