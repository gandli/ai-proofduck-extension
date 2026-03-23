import { describe, expect, it } from 'vitest';

import type { Settings } from '../../shared/contracts';
import { processText } from './processText';

const settings: Settings = {
  targetLanguage: 'English',
  enginePreference: 'auto',
  localModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  localAllowWasmFallback: true,
  translationFallbackEnabled: true,
  onlineApiBase: '',
  onlineApiKey: '',
  onlineModel: '',
};

describe('processText', () => {
  it('returns translated output for translate mode', () => {
    const result = processText('你好，世界。', 'translate', settings, 'chrome-ai');

    expect(result).toContain('Hello');
  });

  it('returns shortened output for summarize mode', () => {
    const input =
      '校对鸭是一个面向网页阅读与写作场景的助手。它可以帮助用户更快理解内容。它也支持在浏览流程内直接处理文本。';

    const result = processText(input, 'summarize', settings, 'chrome-ai');

    expect(result.length).toBeLessThan(input.length);
    expect(result).toContain('重点');
  });

  it('fixes obvious mistakes for correct mode', () => {
    const result = processText('這 是一個 錯字很多 的句子,,', 'correct', settings, 'chrome-ai');

    expect(result).toContain('这是一个');
    expect(result).not.toContain(',,');
  });

  it('makes phrasing more polished for proofread mode', () => {
    const result = processText('这个方案还行，但是表达比较普通。', 'proofread', settings, 'chrome-ai');

    expect(result).toContain('更自然');
  });

  it('expands short text for expand mode', () => {
    const input = '请尽快提交周报';
    const result = processText(input, 'expand', settings, 'chrome-ai');

    expect(result.length).toBeGreaterThan(input.length);
    expect(result).toContain('建议');
  });
});
