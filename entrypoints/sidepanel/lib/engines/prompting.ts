import type { ModeKey, Settings } from '../../../shared/contracts';

export function buildInstruction(mode: ModeKey, settings: Settings) {
  switch (mode) {
    case 'translate':
      return `请把用户提供的文本翻译成${settings.targetLanguage}，只返回结果正文。`;
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
