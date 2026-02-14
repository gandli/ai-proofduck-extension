import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importFilesToCache } from '../file-utils';

// Mock File and caches
class MockFile {
  name: string;
  webkitRelativePath: string;
  size: number;

  constructor(content: string[], name: string, options: any) {
    this.name = name;
    this.webkitRelativePath = name; // Simplify for test
    this.size = 1024;
  }
}

global.File = MockFile as any;
global.Response = class {
  constructor(body: any) {}
} as any;

const mockCache = {
  put: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate 10ms I/O
  }),
};

const mockCaches = {
  open: vi.fn().mockResolvedValue(mockCache),
};

global.caches = mockCaches as any;

describe('File Import Benchmark', () => {
  const fileCount = 100;
  const files = Array.from({ length: fileCount }).map((_, i) => new MockFile([], `model/file${i}.bin`, {}));
  // Add length to the array like FileList
  (files as any).length = fileCount;

  const modelId = 'test-model';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures optimized importFilesToCache time', async () => {
    const start = Date.now();
    let progressCalls = 0;

    await importFilesToCache(files as any as FileList, modelId, (count, total) => {
        progressCalls++;
    });

    const duration = Date.now() - start;
    console.log(`Optimized import took ${duration}ms`);

    // With 100 files and 10ms delay:
    // Sequential: 100 * 10 = 1000ms
    // Parallel: max(10ms) + overhead ~= 15-20ms

    expect(duration).toBeLessThan(200); // Should be much faster than 1000ms
    expect(mockCache.put).toHaveBeenCalledTimes(fileCount);
  });
});
