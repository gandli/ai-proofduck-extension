import type { EnginePreference, EngineType, ModeKey, Settings } from '../../shared/contracts';

export interface RuntimeCapabilities {
  hasLanguageModel: boolean;
  hasWebGpu: boolean;
}

export interface EngineCandidate {
  engine: EngineType;
  reason: string;
}

const PREFERRED_TO_ENGINE: Record<Exclude<EnginePreference, 'auto'>, EngineType> = {
  'chrome-ai': 'chrome-ai',
  local: 'local',
  online: 'online',
};

function dedupe(candidates: EngineType[]) {
  return candidates.filter((item, index) => candidates.indexOf(item) === index);
}

function createCandidate(engine: EngineType): EngineCandidate {
  switch (engine) {
    case 'chrome-ai':
      return { engine, reason: '优先使用浏览器内置 AI' };
    case 'local':
      return { engine, reason: '内置 AI 不可用时，切到本地模型' };
    case 'online':
      return { engine, reason: '本地路径不可用时，切到在线 API' };
    case 'fallback':
      return { engine, reason: '翻译模式最后使用第三方免费翻译兜底' };
    default:
      return { engine, reason: '候选引擎' };
  }
}

export function getEngineAttemptOrder(mode: ModeKey, settings: Settings): EngineCandidate[] {
  const automaticOrder: EngineType[] = ['chrome-ai', 'local', 'online'];
  const preferred =
    settings.enginePreference === 'auto'
      ? automaticOrder
      : [PREFERRED_TO_ENGINE[settings.enginePreference], ...automaticOrder];

  const withFallback: EngineType[] =
    mode === 'translate' && settings.translationFallbackEnabled
      ? [...preferred, 'fallback']
      : [...preferred];

  return dedupe(withFallback).map(createCandidate);
}

export function pickFirstMeaningfulEngine(
  mode: ModeKey,
  settings: Settings,
  unavailable: Set<EngineType>,
) {
  return getEngineAttemptOrder(mode, settings).find((candidate) => !unavailable.has(candidate.engine)) ?? null;
}
