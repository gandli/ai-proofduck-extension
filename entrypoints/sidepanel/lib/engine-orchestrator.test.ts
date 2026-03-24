import { describe, expect, it } from 'vitest';

import type { Settings } from '../../shared/contracts';
import { getEngineAttemptOrder, pickFirstMeaningfulEngine } from '../../../lib/processing/engine-orchestrator';

const baseSettings: Settings = {
  targetLanguage: '中文',
  enginePreference: 'auto',
  localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  localAllowWasmFallback: true,
  translationFallbackEnabled: true,
  onlineApiBase: '',
  onlineApiKey: '',
  onlineModel: '',
};

describe('engine-orchestrator', () => {
  it('uses chrome -> local -> online in auto mode', () => {
    expect(getEngineAttemptOrder('summarize', baseSettings).map((item) => item.engine)).toEqual([
      'chrome-ai',
      'local',
      'online',
    ]);
  });

  it('appends translation fallback for translate mode', () => {
    expect(getEngineAttemptOrder('translate', baseSettings).map((item) => item.engine)).toEqual([
      'chrome-ai',
      'local',
      'online',
      'fallback',
    ]);
  });

  it('uses only the selected engine in strict mode', () => {
    expect(
      getEngineAttemptOrder('summarize', {
        ...baseSettings,
        enginePreference: 'online',
      }).map((item) => item.engine),
    ).toEqual(['online']);
  });

  it('finds the next available engine when earlier engines are unavailable', () => {
    const picked = pickFirstMeaningfulEngine('translate', baseSettings, new Set(['chrome-ai', 'local']));

    expect(picked?.engine).toBe('online');
  });

  it('returns translation fallback last when everything else is unavailable', () => {
    const picked = pickFirstMeaningfulEngine('translate', baseSettings, new Set(['chrome-ai', 'local', 'online']));

    expect(picked?.engine).toBe('fallback');
  });
});
