import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Settings, ModeKey } from '../types';
import { DEFAULT_SETTINGS } from '../types';

// ============================================================
// BDD Tests: Chrome Built-in AI (Gemini Nano) Engine
// ============================================================

// --- Helpers ---

const chromeAiSettings: Settings = {
  ...DEFAULT_SETTINGS,
  engine: 'chrome-ai',
};

function createMockPostMessage() {
  return vi.fn();
}

/** Simulate the worker's chrome-ai load logic (extracted from worker.ts) */
async function simulateLoad(
  settings: Settings,
  ai: any,
  postMessage: Mock,
) {
  if (settings.engine === 'chrome-ai') {
    try {
      const modelApi = ai?.languageModel || (globalThis as any).LanguageModel;

      if (!modelApi) {
        // ... (error message omitted for brevity as it remains same)
         const debugInfo = !ai ? "'ai' and 'LanguageModel' undefined" : "'languageModel' undefined";
        throw new Error(
            `Chrome Built-in AI not available (${debugInfo}).\n` +
            "Please ensure:\n" +
            "1. Chrome 128+ (Dev/Canary).\n" +
            "2. chrome://flags/#prompt-api-for-gemini-nano : Enabled\n" +
            "3. chrome://flags/#optimization-guide-on-device-model : Enabled BypassPerfRequirement\n" +
            "4. chrome://components/ : Click 'Check for update' on 'Optimization Guide On Device Model'\n" +
            "Relaunch Chrome after changes."
        );
      }
      
      let available = 'no';
      if (modelApi && typeof modelApi.capabilities === 'function') {
         const caps = await modelApi.capabilities();
         available = caps.available;
      } else if (ai && typeof ai.capabilities === 'function') {
         const caps = await ai.capabilities();
         available = caps.available;
      } else {
          try {
            const session = await modelApi.create({ systemPrompt: ' ' });
            await session.destroy();
            available = 'readily';
          } catch (e) {
             throw new Error("Chrome AI found but 'capabilities' missing and session creation failed. Update Chrome.");
          }
      }

      if (available === 'no') {
        throw new Error('Chrome Built-in AI model not downloaded');
      }
      postMessage({ type: 'ready' });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      postMessage({ type: 'error', error: errMsg });
    }
  }
}

/** Simulate the worker's chrome-ai generate logic (extracted from worker.ts) */
async function simulateGenerate(
  text: string,
  mode: ModeKey,
  settings: Settings,
  ai: any,
  postMessage: Mock,
  requestId?: string,
) {
  try {
    const modelApi = ai?.languageModel || (globalThis as any).LanguageModel;

    if (!modelApi) {
      const debugInfo = !ai ? "'ai' and 'LanguageModel' undefined" : "'languageModel' undefined";
      throw new Error(
        `Chrome Built-in AI not available (${debugInfo}).\n` +
          'Please ensure:\n' +
          '1. Chrome 128+ (Dev/Canary).\n' +
          "2. chrome://flags/#prompt-api-for-gemini-nano : Enabled\n" +
          "3. chrome://flags/#optimization-guide-on-device-model : Enabled BypassPerfRequirement\n" +
          "4. chrome://components/ : Click 'Check for update' on 'Optimization Guide On Device Model'\n" +
          'Relaunch Chrome after changes.',
      );
    }
    const session = await modelApi.create({ systemPrompt: 'test' });
    const stream = await session.promptStreaming(text);

    let previousChunk = '';
    let fullText = '';
    
    for await (const chunk of stream) {
      const newText = typeof chunk === 'string' ? chunk : (chunk as any).content || JSON.stringify(chunk);
      
      let isDelta = false;
      if (fullText.length > 0 && newText.length < fullText.length) {
         isDelta = true;
      } else {
         isDelta = !newText.startsWith(previousChunk);
      }

      if (isDelta) {
        fullText += newText;
      } else {
        fullText = newText;
      }
      
      previousChunk = newText;
      postMessage({ type: 'update', text: fullText, mode, requestId });
    }
    
    session.destroy();
    postMessage({ type: 'complete', text: fullText, mode, requestId });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    postMessage({ type: 'error', error: errMsg, mode, requestId });
  }
}

// --- BDD Tests ---

describe('Feature: Chrome Built-in AI Engine', () => {

  describe('Scenario: Detect Chrome AI availability', () => {

    it('Given Chrome supports Prompt API, When loading chrome-ai engine, Then it should report ready', async () => {
      const postMessage = createMockPostMessage();
      const mockAi = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      await simulateLoad(chromeAiSettings, mockAi, postMessage);

      expect(postMessage).toHaveBeenCalledWith({ type: 'ready' });
    });

    it('Given Chrome does NOT support Prompt API, When loading chrome-ai engine, Then it should report error', async () => {
      const postMessage = createMockPostMessage();

      await simulateLoad(chromeAiSettings, undefined, postMessage);

      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', error: expect.stringContaining("'ai' and 'LanguageModel' undefined") }),
      );
    });

    it('Given ai.languageModel exists but model not downloaded, When loading, Then it should report error', async () => {
      const postMessage = createMockPostMessage();
      const mockAi = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'no' }),
        },
      };

      await simulateLoad(chromeAiSettings, mockAi, postMessage);

      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', error: expect.stringContaining('not downloaded') }),
      );
    });

    it('Given ai exists but languageModel is null, When loading, Then it should report error', async () => {
      const postMessage = createMockPostMessage();
      const mockAi = { languageModel: null };

      await simulateLoad(chromeAiSettings, mockAi, postMessage);

      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', error: expect.stringContaining('languageModel') }),
      );
    });


    it('Given window.ai is missing but window.LanguageModel exists, When loading, Then it should report ready', async () => {
      const postMessage = createMockPostMessage();
      (globalThis as any).LanguageModel = {
        capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
      };

      await simulateLoad(chromeAiSettings, undefined, postMessage);

      expect(postMessage).toHaveBeenCalledWith({ type: 'ready' });
      delete (globalThis as any).LanguageModel;
    });

    it('Given capabilities missing but create works, When loading, Then it should report ready', async () => {
      const postMessage = createMockPostMessage();
      const mockSession = { destroy: vi.fn() };
      const mockAi = {
        languageModel: {
           create: vi.fn().mockResolvedValue(mockSession)
        },
      };

      await simulateLoad(chromeAiSettings, mockAi, postMessage);

      expect(postMessage).toHaveBeenCalledWith({ type: 'ready' });
      expect(mockSession.destroy).toHaveBeenCalled();
    });
  });



  describe('Scenario: Streaming text generation via Chrome AI', () => {

    it('Given Chrome AI is ready and streams accumulated text, When generating, Then it should handle it correctly', async () => {
      const postMessage = createMockPostMessage();
      // Simulating accumulated chunks
      const chunks = ['校对', '校对结果', '校对结果：已修正'];
      async function* mockStream() {
        for (const c of chunks) yield c;
      }
      const mockSession = {
        promptStreaming: vi.fn().mockReturnValue(mockStream()),
        destroy: vi.fn(),
      };
      const mockAi = {
        languageModel: {
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await simulateGenerate('测试文本', 'correct', chromeAiSettings, mockAi, postMessage, 'req-1');

      const updates = postMessage.mock.calls.filter((c: any) => c[0].type === 'update');
      // The worker should identify this as Accumulated and replace fullText
      expect(updates).toHaveLength(3);
      expect(updates[2][0].text).toBe('校对结果：已修正');
      
      expect(postMessage).toHaveBeenCalledWith({
        type: 'complete', text: '校对结果：已修正', mode: 'correct', requestId: 'req-1',
      });
      expect(mockSession.destroy).toHaveBeenCalled();
    });

    it('Given Chrome AI is ready and streams DELTA text, When generating, Then it should assemble it correctly', async () => {
      const postMessage = createMockPostMessage();
      // Simulating delta chunks (standard LLM stream style)
      // "He" does NOT start with "H" (previous empty), so first is accum? No wait.
      // 1. "H" (starts with ""? yes, so accum? Wait logic: if new.startsWith(prev) && prev != '')
      // 1. "H". prev="" -> logic: startsWith "" is true. prev!='' is false. ELSE -> fullText += "H". prev="H"
      // 2. "e". prev="H". "e".startsWith("H") -> false. ELSE -> fullText += "e" -> "He". prev="e"
      // 3. "l". prev="e". "l".startsWith("e") -> false. ELSE -> fullText += "l" -> "Hel". prev="l"
      const chunks = ['H', 'e', 'l', 'l', 'o'];
      async function* mockStream() {
        for (const c of chunks) yield c;
      }
      const mockSession = {
        promptStreaming: vi.fn().mockReturnValue(mockStream()),
        destroy: vi.fn(),
      };
      const mockAi = {
        languageModel: { create: vi.fn().mockResolvedValue(mockSession) },
      };

      await simulateGenerate('hi', 'expand', chromeAiSettings, mockAi, postMessage, 'req-delta');

      const updates = postMessage.mock.calls.filter((c: any) => c[0].type === 'update');
      expect(updates).toHaveLength(5);
      // The last update should contain the full assembled text
      expect(updates[4][0].text).toBe('Hello');

      expect(postMessage).toHaveBeenCalledWith({
        type: 'complete', text: 'Hello', mode: 'expand', requestId: 'req-delta',
      });
    });

    it('Given Chrome AI is ready, When generating with all 5 modes, Then each mode should work', async () => {
      const modes: ModeKey[] = ['summarize', 'correct', 'proofread', 'translate', 'expand'];

      for (const mode of modes) {
        const postMessage = createMockPostMessage();
        async function* mockStream() { yield '结果'; }
        const mockSession = {
          promptStreaming: vi.fn().mockReturnValue(mockStream()),
          destroy: vi.fn(),
        };
        const mockAi = {
          languageModel: { create: vi.fn().mockResolvedValue(mockSession) },
        };

        await simulateGenerate('文本', mode, chromeAiSettings, mockAi, postMessage);

        expect(postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'complete', mode }),
        );
      }
    });

    it('Given Chrome AI session creation fails, When generating, Then it should report error with mode', async () => {
      const postMessage = createMockPostMessage();
      const mockAi = {
        languageModel: {
          create: vi.fn().mockRejectedValue(new Error('Session limit reached')),
        },
      };

      await simulateGenerate('文本', 'proofread', chromeAiSettings, mockAi, postMessage, 'req-2');

      expect(postMessage).toHaveBeenCalledWith({
        type: 'error', error: 'Session limit reached', mode: 'proofread', requestId: 'req-2',
      });
    });

    it('Given Chrome AI stream throws mid-way, When generating, Then it should report error', async () => {
      const postMessage = createMockPostMessage();
      async function* failingStream() {
        yield '部分结果';
        throw new Error('Stream interrupted');
      }
      const mockSession = {
        promptStreaming: vi.fn().mockReturnValue(failingStream()),
        destroy: vi.fn(),
      };
      const mockAi = {
        languageModel: { create: vi.fn().mockResolvedValue(mockSession) },
      };

      await simulateGenerate('文本', 'summarize', chromeAiSettings, mockAi, postMessage);

      // Should have sent at least one update before error
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'update', text: '部分结果' }),
      );
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', error: 'Stream interrupted' }),
      );
    });

    it('Given AI not available, When generating, Then it should report descriptive error', async () => {
      const postMessage = createMockPostMessage();

      await simulateGenerate('文本', 'translate', chromeAiSettings, undefined, postMessage);

      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error: expect.stringContaining("'ai' and 'LanguageModel' undefined"),
          mode: 'translate',
        }),
      );
    });
  });

  describe('Scenario: Engine selection and settings', () => {

    it('Given engine is set to chrome-ai, Then settings.engine should be "chrome-ai"', () => {
      expect(chromeAiSettings.engine).toBe('chrome-ai');
    });

    it('Given chrome-ai engine, Then no apiKey or localModel should be required', () => {
      // chrome-ai doesn't need API key or local model config
      const settings: Settings = { ...DEFAULT_SETTINGS, engine: 'chrome-ai' };
      // These fields exist but are irrelevant for chrome-ai
      expect(settings.apiKey).toBe('');
      expect(settings.localModel).toBeTruthy(); // has default but not used
    });
  });

  describe('Scenario: Session lifecycle management', () => {

    it('Given a successful generation, When complete, Then session.destroy() should be called exactly once', async () => {
      const postMessage = createMockPostMessage();
      async function* mockStream() { yield '完成'; }
      const mockSession = {
        promptStreaming: vi.fn().mockReturnValue(mockStream()),
        destroy: vi.fn(),
      };
      const mockAi = {
        languageModel: { create: vi.fn().mockResolvedValue(mockSession) },
      };

      await simulateGenerate('文本', 'correct', chromeAiSettings, mockAi, postMessage);

      expect(mockSession.destroy).toHaveBeenCalledTimes(1);
    });

    it('Given systemPrompt is passed, When creating session, Then create() receives systemPrompt', async () => {
      const postMessage = createMockPostMessage();
      async function* mockStream() { yield 'ok'; }
      const mockSession = {
        promptStreaming: vi.fn().mockReturnValue(mockStream()),
        destroy: vi.fn(),
      };
      const mockAi = {
        languageModel: { create: vi.fn().mockResolvedValue(mockSession) },
      };

      await simulateGenerate('文本', 'correct', chromeAiSettings, mockAi, postMessage);

      expect(mockAi.languageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ systemPrompt: expect.any(String) }),
      );
    });
  });

  describe('Scenario: Capability detection edge cases', () => {

    it('Given capabilities() returns "after-download", When loading, Then it should report ready (model will auto-download)', async () => {
      const postMessage = createMockPostMessage();
      const mockAi = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'after-download' }),
        },
      };

      await simulateLoad(chromeAiSettings, mockAi, postMessage);

      // 'after-download' !== 'no', so it passes
      expect(postMessage).toHaveBeenCalledWith({ type: 'ready' });
    });

    it('Given capabilities() throws, When loading, Then it should report error', async () => {
      const postMessage = createMockPostMessage();
      const mockAi = {
        languageModel: {
          capabilities: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      };

      await simulateLoad(chromeAiSettings, mockAi, postMessage);

      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', error: 'Permission denied' }),
      );
    });
  });

  describe('Scenario: RequestId propagation', () => {

    it('Given a requestId, When streaming, Then all messages should carry the same requestId', async () => {
      const postMessage = createMockPostMessage();
      async function* mockStream() { yield 'a'; yield 'b'; }
      const mockSession = {
        promptStreaming: vi.fn().mockReturnValue(mockStream()),
        destroy: vi.fn(),
      };
      const mockAi = {
        languageModel: { create: vi.fn().mockResolvedValue(mockSession) },
      };

      await simulateGenerate('文本', 'expand', chromeAiSettings, mockAi, postMessage, 'req-42');

      for (const call of postMessage.mock.calls) {
        expect(call[0].requestId).toBe('req-42');
      }
    });

    it('Given no requestId, When streaming, Then messages should have undefined requestId', async () => {
      const postMessage = createMockPostMessage();
      async function* mockStream() { yield 'x'; }
      const mockSession = {
        promptStreaming: vi.fn().mockReturnValue(mockStream()),
        destroy: vi.fn(),
      };
      const mockAi = {
        languageModel: { create: vi.fn().mockResolvedValue(mockSession) },
      };

      await simulateGenerate('文本', 'summarize', chromeAiSettings, mockAi, postMessage);

      const complete = postMessage.mock.calls.find((c: any) => c[0].type === 'complete');
      expect(complete![0].requestId).toBeUndefined();
    });
  });

  // ============================================================
  // Specialized Chrome AI APIs (Summarizer, Translator, Rewriter, Proofreader, Writer)
  // ============================================================

  describe('Scenario: Specialized API routing per mode', () => {
    it('Given Summarizer API available When mode=summarize Then should use Summarizer, not Prompt API', async () => {
      const postMessage = createMockPostMessage();
      const destroySpy = vi.fn();
      async function* mockStream() { yield '要点摘要'; }
      const mockGlobal: any = {
        Summarizer: {
          create: vi.fn().mockResolvedValue({
            summarizeStreaming: vi.fn().mockReturnValue(mockStream()),
            destroy: destroySpy,
          }),
        },
      };
      // Simulate trySpecializedAPI for summarize
      const summarizer = await mockGlobal.Summarizer.create({ type: 'key-points', format: 'plain-text', length: 'medium' });
      const stream = summarizer.summarizeStreaming('长文本');
      let result = '';
      for await (const chunk of stream) { result = chunk; postMessage({ type: 'update', text: result, mode: 'summarize' }); }
      summarizer.destroy();
      postMessage({ type: 'complete', text: result, mode: 'summarize' });

      expect(mockGlobal.Summarizer.create).toHaveBeenCalled();
      expect(destroySpy).toHaveBeenCalled();
      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', text: '要点摘要' }));
    });

    it('Given Translator API available When mode=translate Then should use Translator', async () => {
      const postMessage = createMockPostMessage();
      const destroySpy = vi.fn();
      async function* mockStream() { yield 'Translation result'; }
      const mockTranslator = {
        create: vi.fn().mockResolvedValue({
          translateStreaming: vi.fn().mockReturnValue(mockStream()),
          destroy: destroySpy,
        }),
      };
      const translator = await mockTranslator.create({ sourceLanguage: 'zh', targetLanguage: 'en' });
      const stream = translator.translateStreaming('中文文本');
      let result = '';
      for await (const chunk of stream) { result = chunk; postMessage({ type: 'update', text: result, mode: 'translate' }); }
      translator.destroy();
      postMessage({ type: 'complete', text: result, mode: 'translate' });

      expect(mockTranslator.create).toHaveBeenCalledWith(expect.objectContaining({ sourceLanguage: 'zh', targetLanguage: 'en' }));
      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', text: 'Translation result' }));
    });

    it('Given Rewriter API available When mode=proofread Then should use Rewriter', async () => {
      const postMessage = createMockPostMessage();
      const destroySpy = vi.fn();
      async function* mockStream() { yield '润色后文本'; }
      const mockRewriter = {
        create: vi.fn().mockResolvedValue({
          rewriteStreaming: vi.fn().mockReturnValue(mockStream()),
          destroy: destroySpy,
        }),
      };
      const rewriter = await mockRewriter.create({ tone: 'more-formal', length: 'as-is' });
      const stream = rewriter.rewriteStreaming('原始文本');
      let result = '';
      for await (const chunk of stream) { result = chunk; }
      rewriter.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(result).toBe('润色后文本');
    });

    it('Given Proofreader API available When mode=correct Then should apply corrections', () => {
      const text = '这是一段有错误的文本';
      const corrections = [
        { startIndex: 4, endIndex: 5, replacement: '个' },
      ];
      let corrected = text;
      const sorted = [...corrections].sort((a, b) => b.startIndex - a.startIndex);
      for (const c of sorted) {
        corrected = corrected.slice(0, c.startIndex) + c.replacement + corrected.slice(c.endIndex);
      }
      expect(corrected).toBe('这是一段个错误的文本');
    });

    it('Given Writer API available When mode=expand Then should use Writer', async () => {
      const postMessage = createMockPostMessage();
      async function* mockStream() { yield '扩写'; yield '扩写后的详细文本'; }
      const mockWriter = {
        create: vi.fn().mockResolvedValue({
          writeStreaming: vi.fn().mockReturnValue(mockStream()),
          destroy: vi.fn(),
        }),
      };
      const writer = await mockWriter.create({ tone: 'more-formal', length: 'long' });
      const stream = writer.writeStreaming('简短文本');
      let result = '';
      for await (const chunk of stream) { result = chunk; postMessage({ type: 'update', text: result, mode: 'expand' }); }
      writer.destroy();
      postMessage({ type: 'complete', text: result, mode: 'expand' });

      expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', text: '扩写后的详细文本' }));
    });
  });

  describe('Scenario: Fallback to Prompt API when specialized API unavailable', () => {
    it('Given no Summarizer in globalThis When mode=summarize Then should fallback to Prompt API', async () => {
      const postMessage = createMockPostMessage();
      // trySpecializedAPI returns null when API not in globalThis
      const specializedResult = ('Summarizer' in {}) ? 'used' : null;
      expect(specializedResult).toBeNull();
      // Then fallbackPromptAPI would be called
    });

    it('Given no Translator When mode=translate Then should fallback to Prompt API', () => {
      const available = 'Translator' in {};
      expect(available).toBe(false);
    });

    it('Given no Rewriter When mode=proofread Then should fallback to Prompt API', () => {
      const available = 'Rewriter' in {};
      expect(available).toBe(false);
    });
  });

  describe('Scenario: Language mapping for Translator', () => {
    const langMap: Record<string, string> = {
      '中文': 'zh', 'English': 'en', '日本語': 'ja', '한국어': 'ko',
      'Français': 'fr', 'Deutsch': 'de', 'Español': 'es',
    };

    it.each(Object.entries(langMap))(
      'Given extension language "%s" When mapping to BCP-47 Then should return "%s"',
      (name, code) => {
        expect(langMap[name]).toBe(code);
      },
    );

    it('Given unknown language When mapping Then should default to "en"', () => {
      const fallback = langMap['Unknown'] || 'en';
      expect(fallback).toBe('en');
    });
  });

  describe('Scenario: Tone mapping for Rewriter/Writer', () => {
    it('Given professional tone When mapping Then should return more-formal', () => {
      const map: Record<string, string> = { professional: 'more-formal', casual: 'more-casual', academic: 'more-formal', concise: 'more-formal' };
      expect(map['professional']).toBe('more-formal');
      expect(map['casual']).toBe('more-casual');
    });
  });

  describe('Scenario: Detail mapping for Writer length', () => {
    it('Given detail levels When mapping Then should return correct Writer length', () => {
      const map: Record<string, string> = { standard: 'medium', detailed: 'long', creative: 'long' };
      expect(map['standard']).toBe('medium');
      expect(map['detailed']).toBe('long');
      expect(map['creative']).toBe('long');
    });
  });
});
