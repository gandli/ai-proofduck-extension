// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Emulate Worker Global Scope
if (typeof self === 'undefined') {
    // @ts-ignore
    globalThis.self = globalThis;
}

// Mock postMessage
// @ts-ignore
self.postMessage = vi.fn();

// Mock fetch
global.fetch = vi.fn();

// Import the worker logic
// Note: importing worker.ts will execute top-level code like self.onmessage = ...
import { handleGenerateOnline } from '../worker';

describe('Worker Benchmark', () => {
    beforeEach(() => {
        // @ts-ignore
        self.postMessage.mockClear();
        (global.fetch as any).mockReset();
    });

    it('should generate excessive postMessages without throttling', async () => {
        const chunkCount = 1000;
        const chunks = Array.from({ length: chunkCount }, (_, i) =>
            `data: ${JSON.stringify({ choices: [{ delta: { content: ` token${i}` } }] })}\n\n`
        );

        const stream = new ReadableStream({
            start(controller) {
                chunks.forEach(chunk => {
                    controller.enqueue(new TextEncoder().encode(chunk));
                });
                controller.close();
            }
        });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            body: stream,
            json: async () => ({})
        });

        const settings = {
            apiKey: 'test-key',
            apiBaseUrl: 'https://api.example.com',
            apiModel: 'test-model'
        };

        await handleGenerateOnline('test input', 'proofread', settings);

        // @ts-ignore
        const updateCalls = self.postMessage.mock.calls.filter((args: any) => args[0].type === 'update');
        console.log(`[Benchmark] Update calls: ${updateCalls.length}`);

        expect(updateCalls.length).toBeLessThan(chunkCount / 2);
    });
});
