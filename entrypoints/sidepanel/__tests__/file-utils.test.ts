import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { importMLCPackage } from '../file-utils';

// Mock global caches and Response
const mockPut = vi.fn();
const mockOpen = vi.fn();

// Add delay to mockPut to simulate I/O and make sequential vs parallel noticeable
mockPut.mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
});

mockOpen.mockResolvedValue({
    put: mockPut
});

// Setup globals
const originalCaches = global.caches;
const originalResponse = global.Response;

beforeAll(() => {
    global.caches = {
        open: mockOpen,
        delete: vi.fn(),
        has: vi.fn(),
        keys: vi.fn(),
        match: vi.fn(),
    } as any;

    global.Response = class {
        constructor(public body: any) {}
    } as any;
});

afterAll(() => {
    global.caches = originalCaches;
    global.Response = originalResponse;
});

describe('importMLCPackage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function createMLCPBuffer(count: number): ArrayBuffer {
        // Calculate size
        // Magic (4) + Count (4)
        // For each entry: UrlLen (4) + Url (let's say 4 chars "test") + Size (8) + Data (1 byte)
        // Entry size = 4 + 4 + 8 + 1 = 17 bytes
        const entrySize = 17;
        const totalSize = 8 + count * entrySize;
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);

        view.setUint32(0, 0x4d4c4350); // Magic
        view.setUint32(4, count);

        let offset = 8;
        for (let i = 0; i < count; i++) {
            const url = "test";
            view.setUint32(offset, url.length);
            offset += 4;

            for (let j = 0; j < url.length; j++) {
                view.setUint8(offset + j, url.charCodeAt(j));
            }
            offset += url.length;

            view.setBigUint64(offset, BigInt(1)); // Data size 1
            offset += 8;

            view.setUint8(offset, 0xAA); // Dummy data
            offset += 1;
        }

        return buffer;
    }

    it('should import package correctly and benchmark', async () => {
        const count = 50;
        const buffer = createMLCPBuffer(count);
        const file = {
            arrayBuffer: vi.fn().mockResolvedValue(buffer)
        } as any as File;

        const onProgress = vi.fn();
        const t = { importing: 'Importing' };

        const start = performance.now();
        await importMLCPackage(file, t, onProgress);
        const end = performance.now();

        expect(mockOpen).toHaveBeenCalledWith('webllm/model');
        expect(mockPut).toHaveBeenCalledTimes(count);
        expect(onProgress).toHaveBeenCalledTimes(count);

        console.log(`Execution time for ${count} items: ${end - start}ms`);
    });
});
