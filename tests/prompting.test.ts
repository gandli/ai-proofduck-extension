import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../entrypoints/shared/contracts';
import { buildInstruction, buildMessageList } from '../lib/processing/engines/prompting';

describe('translation prompting', () => {
  it('uses a strict translator instruction for local and online models', () => {
    const instruction = buildInstruction('translate', {
      ...DEFAULT_SETTINGS,
      targetLanguage: '中文',
    });

    expect(instruction).toContain('translation engine');
    expect(instruction).toContain('Do not explain');
  });

  it('wraps translation input with target language metadata', () => {
    const messages = buildMessageList('Hello, ProofDuck!', 'translate', {
      ...DEFAULT_SETTINGS,
      targetLanguage: '中文',
    });

    expect(messages[1]?.content).toContain('TARGET_LANGUAGE: Simplified Chinese');
    expect(messages[1]?.content).toContain('SOURCE_TEXT:');
    expect(messages[3]?.content).toContain('Hello, ProofDuck!');
  });

  it('adds a concrete translation example for chinese output', () => {
    const messages = buildMessageList('Hello, ProofDuck!', 'translate', {
      ...DEFAULT_SETTINGS,
      targetLanguage: '中文',
    });

    expect(messages).toHaveLength(4);
    expect(messages[1]?.content).toContain('The meeting starts at nine.');
    expect(messages[2]?.content).toContain('会议九点开始。');
  });
});
