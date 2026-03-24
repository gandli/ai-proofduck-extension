import type { EngineType, ModeKey, Settings } from '../../entrypoints/shared/contracts';

const TRANSLATION_MAP: Record<string, string> = {
  你好: 'Hello',
  世界: 'world',
  校对鸭: 'ProofDuck',
  浏览器: 'browser',
  文本: 'text',
};

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[。！？.!?])/)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
}

function translateText(text: string, settings: Settings, engine: EngineType) {
  let result = normalizeWhitespace(text);

  for (const [source, target] of Object.entries(TRANSLATION_MAP)) {
    result = result.replaceAll(source, target);
  }

  if (settings.targetLanguage === 'English') {
    result = result
      .replaceAll('，', ', ')
      .replaceAll('。', '.')
      .replaceAll('这是', 'This is')
      .replaceAll('一个', 'a ');
  }

  const enginePrefix = engine === 'fallback' ? '翻译兜底结果' : '翻译结果';
  return `${enginePrefix}（${settings.targetLanguage}）：${result}`;
}

function summarizeText(text: string) {
  const sentences = splitSentences(text);
  const picked = sentences.slice(0, 2).join('');
  return `重点：${picked || normalizeWhitespace(text).slice(0, 60)}`;
}

function correctText(text: string) {
  return normalizeWhitespace(text)
    .replaceAll('這', '这')
    .replaceAll('個', '个')
    .replaceAll('錯', '错')
    .replaceAll(',,', '，')
    .replaceAll('..', '。')
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1')
    .replace(/\s+([，。！？])/g, '$1');
}

function proofreadText(text: string) {
  const cleaned = correctText(text);
  return `更自然的表达：${cleaned.replace('还行', '已经比较清晰').replace('但是', '同时')}`;
}

function expandText(text: string) {
  const cleaned = normalizeWhitespace(text);
  return `${cleaned}。建议补充背景、截止时间和期望结果，这样接收方更容易快速执行，也能减少来回确认。`;
}

export function processText(text: string, mode: ModeKey, settings: Settings, engine: EngineType) {
  switch (mode) {
    case 'translate':
      return translateText(text, settings, engine);
    case 'summarize':
      return summarizeText(text);
    case 'correct':
      return correctText(text);
    case 'proofread':
      return proofreadText(text);
    case 'expand':
      return expandText(text);
    default:
      return text;
  }
}
