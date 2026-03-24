import type { Settings } from '../../entrypoints/shared/contracts';

const INLINE_LONG_TIMEOUT_MS = 60_000;
const INLINE_SHORT_TIMEOUT_MS = 15_000;

export function getInlineTranslationTimeoutMs(settings: Pick<Settings, 'enginePreference'>) {
  if (settings.enginePreference === 'online') {
    return INLINE_SHORT_TIMEOUT_MS;
  }

  return INLINE_LONG_TIMEOUT_MS;
}

export function getInlineTranslationUnavailableMessage(settings: Pick<Settings, 'enginePreference'>) {
  if (settings.enginePreference === 'online') {
    return '当前策略暂时不可用，请点击 🐣 在侧边栏中继续。';
  }

  return '当前策略仍在准备中，请稍后再试，或点击 🐣 在侧边栏中继续。';
}

export function buildInlineTranslationWarmupKey(
  settings: Pick<
    Settings,
    | 'enginePreference'
    | 'targetLanguage'
    | 'localModel'
    | 'localAllowWasmFallback'
    | 'translationFallbackEnabled'
    | 'onlineApiBase'
    | 'onlineApiKey'
    | 'onlineModel'
  >,
) {
  return JSON.stringify({
    enginePreference: settings.enginePreference,
    targetLanguage: settings.targetLanguage,
    localModel: settings.localModel,
    localAllowWasmFallback: settings.localAllowWasmFallback,
    translationFallbackEnabled: settings.translationFallbackEnabled,
    onlineApiBase: settings.onlineApiBase,
    onlineModel: settings.onlineModel,
    onlineApiConfigured: Boolean(settings.onlineApiKey),
  });
}
