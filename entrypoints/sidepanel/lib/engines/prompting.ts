import type { ModeKey, Settings } from '../../../shared/contracts';

function normalizeTargetLanguage(language: string) {
  const normalized = language.trim().toLowerCase();

  if (!normalized) {
    return 'the target language';
  }

  if (normalized.includes('中文') || normalized.includes('chinese') || normalized === 'zh') {
    return 'Simplified Chinese';
  }

  if (normalized.includes('english') || normalized.includes('英语') || normalized === 'en') {
    return 'English';
  }

  if (normalized.includes('japanese') || normalized.includes('日语') || normalized.includes('日本語') || normalized === 'ja') {
    return 'Japanese';
  }

  return language.trim();
}

function getTranslationExample(language: string) {
  switch (language) {
    case 'Simplified Chinese':
      return {
        source: 'The meeting starts at nine.',
        result: '会议九点开始。',
      };
    case 'English':
      return {
        source: '会议九点开始。',
        result: 'The meeting starts at nine.',
      };
    case 'Japanese':
      return {
        source: 'The meeting starts at nine.',
        result: '会議は9時に始まります。',
      };
    default:
      return null;
  }
}

export function buildInstruction(mode: ModeKey, settings: Settings) {
  switch (mode) {
    case 'translate':
      return [
        'You are a translation engine.',
        `Translate the user text into ${normalizeTargetLanguage(settings.targetLanguage)}.`,
        'Return only the translated text.',
        'Do not explain.',
        'Do not add notes, prefixes, quotation marks, or extra sentences.',
        'If the source text is already in the target language, return it unchanged.',
        'The example is only a format reference. Never repeat or mention the example content.',
      ].join(' ');
    case 'summarize':
      return '请把用户提供的文本摘要成简洁重点，只返回结果正文。';
    case 'correct':
      return '请修正文中的错字、病句和标点问题，只返回修正后的文本。';
    case 'proofread':
      return '请把文本润色得更自然、更顺，只返回润色后的文本。';
    case 'expand':
      return '请在不改变原意的前提下适度扩写文本，只返回扩写后的文本。';
    default:
      return '请处理下面的文本，只返回结果正文。';
  }
}

export function buildMessageList(text: string, mode: ModeKey, settings: Settings) {
  if (mode === 'translate') {
    const targetLanguage = normalizeTargetLanguage(settings.targetLanguage);
    const example = getTranslationExample(targetLanguage);

    return [
      {
        role: 'system',
        content: buildInstruction(mode, settings),
      },
      ...(example
        ? [
            {
              role: 'user',
              content: `TARGET_LANGUAGE: ${targetLanguage}\nSOURCE_TEXT:\n${example.source}`,
            },
            {
              role: 'assistant',
              content: example.result,
            },
          ]
        : []),
      {
        role: 'user',
        content: `TARGET_LANGUAGE: ${targetLanguage}\nSOURCE_TEXT:\n${text}`,
      },
    ];
  }

  return [
    {
      role: 'system',
      content: buildInstruction(mode, settings),
    },
    {
      role: 'user',
      content: text,
    },
  ];
}

export function extractAssistantText(data: unknown) {
  const content = (data as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === 'string' ? item : (item as { text?: string })?.text ?? ''))
      .join('')
      .trim();
  }

  return '';
}
