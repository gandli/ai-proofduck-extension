import { describe, it, expect } from 'vitest';

describe('TranslationEngine Interface', () => {
  it('should have required properties', () => {
    const mockEngine = {
      id: 'test-engine',
      name: 'Test Engine',
      category: 'translation' as const,
      priority: 1,
      capabilities: {
        supportedLanguages: ['en', 'zh'],
        maxTextLength: 5000,
      },
      checkAvailability: async () => true,
      translate: async () => ({
        translatedText: 'test',
        engine: 'test-engine',
      }),
    };

    expect(mockEngine.id).toBe('test-engine');
    expect(mockEngine.name).toBe('Test Engine');
    expect(mockEngine.category).toBe('translation');
    expect(mockEngine.priority).toBe(1);
  });

  it('should support stream method optionally', async () => {
    const streamEngine = {
      id: 'stream-engine',
      name: 'Stream Engine',
      category: 'llm' as const,
      priority: 2,
      capabilities: {
        supportedLanguages: ['en', 'zh', 'ja'],
        maxTextLength: 10000,
      },
      checkAvailability: async () => true,
      translate: async () => ({
        translatedText: 'stream test',
        engine: 'stream-engine',
      }),
      stream: async function* () {
        yield 'Hello';
        yield ' World';
      },
    };

    const result = streamEngine.stream!();
    const chunks: string[] = [];

    for await (const chunk of result) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' World']);
  });
});

describe('EngineManager (placeholder)', () => {
  it('should register engines', () => {
    const engines: string[] = [];
    const register = (id: string) => engines.push(id);

    register('google');
    register('bing');

    expect(engines).toContain('google');
    expect(engines).toHaveLength(2);
  });

  it('should select engine by priority', () => {
    const engines = [
      { id: 'google', priority: 1 },
      { id: 'bing', priority: 2 },
    ];

    const sorted = [...engines].sort((a, b) => a.priority - b.priority);
    expect(sorted[0]?.id).toBe('google');
  });
});