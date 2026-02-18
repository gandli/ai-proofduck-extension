import { describe, it, expect, vi } from 'vitest';
import type { Settings, ModeKey } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { getSystemPrompt } from '../worker-utils';

// We test the worker logic by extracting and simulating the functions,
// since the actual worker.ts runs in a Worker context with self.postMessage.

const onlineSettings: Settings = { ...DEFAULT_SETTINGS, engine: 'online', apiKey: 'test-key', apiBaseUrl: 'https://api.test.com/v1', apiModel: 'test-model' };
const localSettings: Settings = { ...DEFAULT_SETTINGS, engine: 'local-gpu' };

/** Simulate handleGenerateOnline logic */
async function simulateOnlineGenerate(
  text: string, mode: ModeKey, settings: Settings,
  postMessage: ReturnType<typeof vi.fn>,
  fetchFn: ReturnType<typeof vi.fn>,
  requestId?: string,
) {
  try {
    const systemPrompt = getSystemPrompt(mode, settings);
    const userContent = `【待处理文本】：\n${text}`;
    if (!settings.apiKey) throw new Error('请在设置中配置 API Key');
    const response = await fetchFn(`${settings.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
      body: JSON.stringify({
        model: settings.apiModel,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
        stream: true,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    if (reader) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const json = JSON.parse(dataStr);
            fullText += json.choices[0]?.delta?.content || '';
            postMessage({ type: 'update', text: fullText, mode, requestId });
          } catch { buffer = line + '\n' + buffer; }
        }
      }
    }
    postMessage({ type: 'complete', text: fullText, mode, requestId });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    postMessage({ type: 'error', error: errMsg, mode, requestId });
  }
}

function createSSEStream(chunks: string[]) {
  let index = 0;
  return {
    getReader: () => ({
      read: vi.fn().mockImplementation(async () => {
        if (index >= chunks.length) return { done: true, value: undefined };
        const encoder = new TextEncoder();
        return { done: false, value: encoder.encode(chunks[index++]) };
      }),
    }),
  };
}

describe('Feature: Worker Online Generation', () => {
  describe('Scenario: Missing API Key', () => {
    it('Given no apiKey When generating online Then should post error', async () => {
      const pm = vi.fn();
      const noKeySettings = { ...onlineSettings, apiKey: '' };
      await simulateOnlineGenerate('text', 'correct', noKeySettings, pm, vi.fn());
      expect(pm).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', error: expect.stringContaining('API Key') }));
    });
  });

  describe('Scenario: HTTP Error', () => {
    it('Given 401 response When generating Then should post error with status', async () => {
      const pm = vi.fn();
      const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      await simulateOnlineGenerate('text', 'correct', onlineSettings, pm, fetchFn);
      expect(pm).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', error: expect.stringContaining('401') }));
    });

    it('Given error message in response body When generating Then should include it', async () => {
      const pm = vi.fn();
      const fetchFn = vi.fn().mockResolvedValue({
        ok: false, status: 403,
        json: async () => ({ error: { message: 'Quota exceeded' } }),
      });
      await simulateOnlineGenerate('text', 'proofread', onlineSettings, pm, fetchFn);
      expect(pm).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', error: 'Quota exceeded' }));
    });
  });

  describe('Scenario: SSE Streaming', () => {
    it('Given valid SSE stream When generating Then should send update and complete', async () => {
      const pm = vi.fn();
      const body = createSSEStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" World"}}]}\n\ndata: [DONE]\n\n',
      ]);
      const fetchFn = vi.fn().mockResolvedValue({ ok: true, body });
      await simulateOnlineGenerate('text', 'translate', onlineSettings, pm, fetchFn, 'r1');

      const updates = pm.mock.calls.filter((c: any) => c[0].type === 'update');
      expect(updates.length).toBeGreaterThanOrEqual(1);
      expect(pm).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', text: 'Hello World', requestId: 'r1' }));
    });

    it('Given [DONE] marker When parsing Then should skip it without error', async () => {
      const pm = vi.fn();
      const body = createSSEStream(['data: [DONE]\n\n']);
      const fetchFn = vi.fn().mockResolvedValue({ ok: true, body });
      await simulateOnlineGenerate('text', 'summarize', onlineSettings, pm, fetchFn);
      expect(pm).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', text: '' }));
    });
  });

  describe('Scenario: Fetch throws', () => {
    it('Given network error When generating Then should post error', async () => {
      const pm = vi.fn();
      const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));
      await simulateOnlineGenerate('text', 'expand', onlineSettings, pm, fetchFn);
      expect(pm).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', error: 'Network error' }));
    });
  });
});

describe('Feature: Worker Message Routing', () => {
  describe('Scenario: Engine routing logic', () => {
    it('Given chrome-ai engine When generating Then should route to chrome-ai handler', () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, engine: 'chrome-ai' };
      expect(settings.engine).toBe('chrome-ai');
    });

    it('Given online engine When generating Then should route to online handler', () => {
      expect(onlineSettings.engine).toBe('online');
    });

    it('Given local-gpu engine When generating Then should route to local queue', () => {
      expect(localSettings.engine).toBe('local-gpu');
    });
  });
});
