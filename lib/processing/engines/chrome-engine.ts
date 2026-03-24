import type { EngineProgress, ModeKey, Settings } from '../../../entrypoints/shared/contracts';

import { buildInstruction } from './prompting';

export type ChromeAvailabilityState = Availability | 'unknown';

interface ChromeExecutionInput {
  text: string;
  mode: ModeKey;
  settings: Settings;
  onProgress?: (progress: EngineProgress) => void;
}

const SUPPORTED_LANGUAGE_CODES = ['en', 'es', 'ja'] as const;
type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

function getLanguageModelClass() {
  const scoped = globalThis as typeof globalThis & {
    LanguageModel?: typeof LanguageModel;
  };

  return scoped.LanguageModel;
}

export async function getChromeAvailability() {
  const LanguageModelClass = getLanguageModelClass();

  if (!LanguageModelClass) {
    return 'unavailable' as const;
  }

  try {
    return await LanguageModelClass.availability();
  } catch {
    return 'unavailable' as const;
  }
}

function toChromeLanguageCode(language: string): SupportedLanguageCode | null {
  const normalized = language.trim().toLowerCase();

  if (normalized.includes('english') || normalized.includes('英语') || normalized === 'en') {
    return 'en';
  }

  if (normalized.includes('spanish') || normalized.includes('西班牙') || normalized === 'es') {
    return 'es';
  }

  if (normalized.includes('japanese') || normalized.includes('日语') || normalized.includes('日本語') || normalized === 'ja') {
    return 'ja';
  }

  return null;
}

export async function executeChromeEngine(input: ChromeExecutionInput) {
  const LanguageModelClass = getLanguageModelClass();

  if (!LanguageModelClass) {
    throw new Error('当前浏览器没有可用的内置 AI');
  }

  const outputLanguage = toChromeLanguageCode(input.settings.targetLanguage);
  if (!outputLanguage) {
    throw new Error('浏览器内置 AI 当前只支持英文、西班牙语、日语输出');
  }

  const availability = await LanguageModelClass.availability({
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: [outputLanguage] }],
  });
  if (availability === 'unavailable') {
    throw new Error('当前浏览器暂不支持内置 AI');
  }

  input.onProgress?.({
    phase: availability === 'available' ? 'loading' : 'downloading',
    progress: availability === 'available' ? 20 : 0,
    message: availability === 'available' ? '正在准备浏览器内置 AI' : '正在下载浏览器内置 AI 所需资源',
  });

  const session = await LanguageModelClass.create({
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: [outputLanguage] }],
    monitor(monitor: CreateMonitor) {
      monitor.addEventListener('downloadprogress', (event: ProgressEvent) => {
        const total = event.total || 1;
        const ratio = Math.max(0, Math.min(1, event.loaded / total));
        input.onProgress?.({
          phase: 'downloading',
          progress: Math.round(ratio * 100),
          message: '正在下载浏览器内置 AI 所需资源',
        });
      });
    },
  });

  try {
    input.onProgress?.({
      phase: 'running',
      progress: 85,
      message: '浏览器内置 AI 正在处理内容',
    });

    const result = await session.prompt(`${buildInstruction(input.mode, input.settings)}\n\n用户文本：${input.text}`);

    input.onProgress?.({
      phase: 'done',
      progress: 100,
      message: '浏览器内置 AI 已完成处理',
    });

    return {
      result: result.trim(),
      notice: availability === 'available' ? '已使用浏览器内置 AI' : '浏览器内置 AI 下载完成并已处理内容',
    };
  } finally {
    session.destroy();
  }
}
