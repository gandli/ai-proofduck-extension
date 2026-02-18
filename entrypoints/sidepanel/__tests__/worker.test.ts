import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGenerateOnline, processLocalQueue, WebLLMWorker } from '../worker';

describe('Feature: Worker Message Handling', () => {
  describe('Scenario: handleGenerateOnline', () => {
    let mockFetch: any;
    let mockPostMessage: any;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
      mockPostMessage = vi.fn();
      global.postMessage = mockPostMessage;
    });

    it('Given missing apiKey When handling generate Then should post error message', async () => {
      const event = { data: { type: 'generate', apiKey: '', model: 'test-model' } };
      await handleGenerateOnline(event);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'error',
        error: 'API key is required'
      });
    });

    it('Given fetch failure When handling generate Then should post error message', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const event = { data: { type: 'generate', apiKey: 'test-key', model: 'test-model' } };
      await handleGenerateOnline(event);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'error',
        error: 'Network error'
      });
    });

    it('Given successful fetch When handling generate Then should process SSE stream', async () => {
      const mockResponse = new ReadableStream({
        start(controller) {
          controller.enqueue('data: {"content":"test"}\n\n');
          controller.enqueue('data: [DONE]\n\n');
          controller.close();
        }
      });
      mockFetch.mockResolvedValue({ body: mockResponse });
      const event = { data: { type: 'generate', apiKey: 'test-key', model: 'test-model' } };
      await handleGenerateOnline(event);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'update',
        content: 'test'
      });
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'complete'
      });
    });
  });

  describe('Scenario: processLocalQueue', () => {
    let mockPostMessage: any;

    beforeEach(() => {
      mockPostMessage = vi.fn();
      global.postMessage = mockPostMessage;
    });

    it('Given empty queue When processing Then should do nothing', () => {
      processLocalQueue();
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('Given multiple tasks When processing Then should execute in order', async () => {
      const mockEngine = {
        generate: vi.fn().mockResolvedValue('test result')
      };
      WebLLMWorker.getEngine = vi.fn().mockResolvedValue(mockEngine);
      const queue = [
        { prompt: 'test1', mode: 'test' },
        { prompt: 'test2', mode: 'test' }
      ];
      await processLocalQueue(queue);
      expect(mockEngine.generate).toHaveBeenCalledTimes(2);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'complete',
        mode: 'test',
        result: 'test result'
      });
    });

    it('Given task error When processing Then should continue with next task', async () => {
      const mockEngine = {
        generate: vi.fn()
          .mockRejectedValueOnce(new Error('Test error'))
          .mockResolvedValue('test result')
      };
      WebLLMWorker.getEngine = vi.fn().mockResolvedValue(mockEngine);
      const queue = [
        { prompt: 'test1', mode: 'test' },
        { prompt: 'test2', mode: 'test' }
      ];
      await processLocalQueue(queue);
      expect(mockEngine.generate).toHaveBeenCalledTimes(2);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'error',
        error: 'Test error'
      });
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'complete',
        mode: 'test',
        result: 'test result'
      });
    });
  });

  describe('Scenario: WebLLMWorker.getEngine', () => {
    it('Given first load When getting engine Then should create new engine', async () => {
      const mockEngine = { generate: vi.fn() };
      WebLLMWorker.getEngine = vi.fn().mockResolvedValue(mockEngine);
      const engine = await WebLLMWorker.getEngine('test-model');
      expect(engine).toBe(mockEngine);
    });

    it('Given same model When getting engine Then should return existing engine', async () => {
      const mockEngine = { generate: vi.fn() };
      WebLLMWorker.getEngine = vi.fn().mockResolvedValue(mockEngine);
      const engine1 = await WebLLMWorker.getEngine('test-model');
      const engine2 = await WebLLMWorker.getEngine('test-model');
      expect(engine1).toBe(engine2);
    });

    it('Given model switch When getting engine Then should create new engine', async () => {
      const mockEngine1 = { generate: vi.fn() };
      const mockEngine2 = { generate: vi.fn() };
      WebLLMWorker.getEngine = vi.fn()
        .mockResolvedValueOnce(mockEngine1)
        .mockResolvedValueOnce(mockEngine2);
      const engine1 = await WebLLMWorker.getEngine('test-model-1');
      const engine2 = await WebLLMWorker.getEngine('test-model-2');
      expect(engine1).not.toBe(engine2);
    });

    it('Given load failure When getting engine Then should clear state', async () => {
      WebLLMWorker.getEngine = vi.fn().mockRejectedValue(new Error('Load failed'));
      try {
        await WebLLMWorker.getEngine('test-model');
      } catch (error) {
        expect(error.message).toBe('Load failed');
      }
    });
  });
});