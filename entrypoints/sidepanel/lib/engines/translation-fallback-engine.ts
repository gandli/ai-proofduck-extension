import type { Settings } from '../../../shared/contracts';

import { processText } from '../processText';

function mapLanguage(language: string) {
  switch (language) {
    case 'English':
      return 'en';
    case '日本語':
      return 'ja';
    case '中文':
    default:
      return 'zh-CN';
  }
}

export async function executeTranslationFallback(text: string, settings: Settings) {
  const source = 'auto';
  const target = mapLanguage(settings.targetLanguage);

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as Array<Array<[string]>>;
    const translated = data?.[0]?.map((item) => item?.[0] ?? '').join('').trim();

    if (!translated) {
      throw new Error('empty translation');
    }

    return {
      result: `翻译兜底结果（${settings.targetLanguage}）：${translated}`,
      notice: '已使用第三方免费翻译兜底',
    };
  } catch {
    return {
      result: processText(text, 'translate', settings, 'fallback'),
      notice: '第三方翻译暂时不可用，已使用内置翻译兜底',
    };
  }
}
