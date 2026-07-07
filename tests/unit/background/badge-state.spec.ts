import { describe, it, expect } from 'vitest';
import { deriveBadgeState } from '../../../src/background/badge-state';

describe('deriveBadgeState · v0.5.2', () => {
  it('全空 → ready（用户没配 openai-compat，走其他引擎）', () => {
    expect(deriveBadgeState({ baseUrl: '', apiKey: '', model: '' })).toBe('ready');
  });

  it('三项齐全 → ready', () => {
    expect(
      deriveBadgeState({
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-abc',
        model: 'deepseek-chat',
      }),
    ).toBe('ready');
  });

  it('缺 apiKey → warn', () => {
    expect(
      deriveBadgeState({ baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'x' }),
    ).toBe('warn');
  });

  it('只填了 baseUrl → warn', () => {
    expect(
      deriveBadgeState({ baseUrl: 'https://api.deepseek.com', apiKey: '', model: '' }),
    ).toBe('warn');
  });

  it('纯空白字符视同未填', () => {
    expect(deriveBadgeState({ baseUrl: '   ', apiKey: '\t', model: '\n' })).toBe('ready');
  });
});
