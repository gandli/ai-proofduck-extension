import type { EngineType, ModeKey, Settings } from '../../shared/contracts';

import { getChromeAvailability } from './engines/chrome-engine';
import { detectLocalRuntime } from './engines/local-runtime';
import { getEngineAttemptOrder, type RuntimeCapabilities } from './engine-orchestrator';

export interface EngineStatus {
  available: boolean;
  label: string;
  message: string;
}

export interface EnginePlan {
  selectedEngine: EngineType | 'auto';
  engine: EngineType;
  notice: string;
  blocked: boolean;
}

const ENGINE_LABELS: Record<EngineType, string> = {
  'chrome-ai': '浏览器内置 AI',
  local: '本地模型',
  online: '在线 API',
  fallback: '翻译兜底服务',
};

export function detectRuntimeCapabilities(): RuntimeCapabilities {
  const scoped = globalThis as typeof globalThis & {
    LanguageModel?: typeof LanguageModel;
    navigator?: Navigator & { gpu?: unknown; userAgent?: string };
  };
  const userAgent = scoped.navigator?.userAgent ?? '';
  const hasWebGpu = userAgent.includes('HeadlessChrome') ? false : Boolean(scoped.navigator?.gpu);

  return {
    hasLanguageModel: Boolean(scoped.LanguageModel),
    hasWebGpu,
  };
}

export function getEngineStatusMap(
  settings: Settings,
  capabilities: RuntimeCapabilities,
): Record<EngineType, EngineStatus> {
  const localRuntime = detectLocalRuntime(settings);

  return {
    'chrome-ai': {
      available: capabilities.hasLanguageModel,
      label: ENGINE_LABELS['chrome-ai'],
      message: capabilities.hasLanguageModel ? '已检测到浏览器内置 AI 接口' : '当前浏览器没有可用的内置 AI 接口',
    },
    local: {
      available: Boolean(localRuntime),
      label: ENGINE_LABELS.local,
      message:
        localRuntime === 'webgpu'
          ? '检测到 WebGPU，本地模型可直接运行'
          : localRuntime === 'wasm'
            ? '当前设备不支持 WebGPU，可切到本地 WASM 模型'
            : '当前设备没有可用的本地模型运行条件',
    },
    online: {
      available: Boolean(settings.onlineApiBase && settings.onlineApiKey && settings.onlineModel),
      label: ENGINE_LABELS.online,
      message:
        settings.onlineApiBase && settings.onlineApiKey && settings.onlineModel
          ? '在线 API 已配置，可直接调用'
          : '在线 API 未配置，请补充地址、密钥和模型名',
    },
    fallback: {
      available: settings.translationFallbackEnabled,
      label: ENGINE_LABELS.fallback,
      message: settings.translationFallbackEnabled ? '翻译兜底已开启' : '翻译兜底当前已关闭',
    },
  };
}

export async function getChromeAvailabilityLabel() {
  const availability = await getChromeAvailability();

  switch (availability) {
    case 'available':
      return '浏览器内置 AI 已就绪';
    case 'downloadable':
      return '浏览器内置 AI 可下载';
    case 'downloading':
      return '浏览器内置 AI 正在下载';
    case 'unavailable':
    default:
      return '浏览器内置 AI 当前不可用';
  }
}

export function resolveEnginePlan(
  mode: ModeKey,
  settings: Settings,
  capabilities: RuntimeCapabilities,
): EnginePlan {
  const statuses = getEngineStatusMap(settings, capabilities);
  const attempts = getEngineAttemptOrder(mode, settings);
  const availableCandidate = attempts.find((candidate) => statuses[candidate.engine].available);

  if (availableCandidate) {
    const preferred = settings.enginePreference === 'auto' ? 'auto' : settings.enginePreference;
    return {
      selectedEngine: preferred,
      engine: availableCandidate.engine,
      notice: `${statuses[availableCandidate.engine].label}：${statuses[availableCandidate.engine].message}`,
      blocked: false,
    };
  }

  const selectedEngine = settings.enginePreference === 'auto' ? 'auto' : settings.enginePreference;
  const selectedStatus =
    settings.enginePreference === 'auto'
      ? '当前自动优先链路都不可用'
      : `${ENGINE_LABELS[settings.enginePreference]}当前不可用`;

  return {
    selectedEngine,
    engine: settings.enginePreference === 'auto' && mode === 'translate' && settings.translationFallbackEnabled ? 'fallback' : 'online',
    notice: `${selectedStatus}，请检查浏览器能力或在线配置`,
    blocked: !(settings.enginePreference === 'auto' && mode === 'translate' && settings.translationFallbackEnabled),
  };
}
