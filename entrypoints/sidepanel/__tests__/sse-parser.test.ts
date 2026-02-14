import { describe, it, expect } from 'vitest';
import { SSEParser } from '../worker-utils';

describe('SSEParser', () => {
    it('should parse a single complete message', () => {
        const parser = new SSEParser();
        const chunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n';
        const results = parser.process(chunk);
        expect(results).toEqual(['Hello']);
    });

    it('should parse multiple messages in one chunk', () => {
        const parser = new SSEParser();
        const chunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: {"choices":[{"delta":{"content":" World"}}]}\n\n';
        const results = parser.process(chunk);
        expect(results).toEqual(['Hello', ' World']);
    });

    it('should handle split messages across chunks', () => {
        const parser = new SSEParser();
        const chunk1 = 'data: {"choices":[{"delta":{"content":"Hel';
        const chunk2 = 'lo"}}]}\n\n';

        const results1 = parser.process(chunk1);
        expect(results1).toEqual([]);

        const results2 = parser.process(chunk2);
        expect(results2).toEqual(['Hello']);
    });

    it('should handle split data prefix', () => {
        const parser = new SSEParser();
        const chunk1 = 'da';
        const chunk2 = 'ta: {"choices":[{"delta":{"content":"Hi"}}]}\n\n';

        const results1 = parser.process(chunk1);
        expect(results1).toEqual([]);

        const results2 = parser.process(chunk2);
        expect(results2).toEqual(['Hi']);
    });

    it('should ignore [DONE] message', () => {
        const parser = new SSEParser();
        const chunk = 'data: [DONE]\n\n';
        const results = parser.process(chunk);
        expect(results).toEqual([]);
    });

    it('should ignore invalid JSON', () => {
        const parser = new SSEParser();
        const chunk = 'data: invalid-json\n\n';
        const results = parser.process(chunk);
        expect(results).toEqual([]);
    });

    it('should handle newlines in buffer correctly', () => {
        const parser = new SSEParser();
        const chunk1 = 'data: {"choices":[{"delta":{"content":"A"}}]}\n';
        const chunk2 = '\ndata: {"choices":[{"delta":{"content":"B"}}]}\n\n';

        const results1 = parser.process(chunk1);
        expect(results1).toEqual(['A']);

        const results2 = parser.process(chunk2);
        expect(results2).toEqual(['B']);
    });
});
