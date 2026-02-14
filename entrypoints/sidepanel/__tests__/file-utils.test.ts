// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { importFilesToCache } from '../file-utils';

describe('importFilesToCache', () => {
  let mockCache: { put: any };
  let mockCaches: { open: any };

  beforeEach(() => {
    mockCache = {
      put: vi.fn(),
    };
    mockCaches = {
      open: vi.fn().mockResolvedValue(mockCache),
    };

    vi.stubGlobal('caches', mockCaches);
    vi.stubGlobal('Response', class MockResponse {
      constructor(public body: any) {}
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should import files with webkitRelativePath correctly', async () => {
    const files = [
      {
        name: 'config.json',
        webkitRelativePath: 'model-folder/config.json',
      },
      {
        name: 'model.bin',
        webkitRelativePath: 'model-folder/model.bin',
      },
    ] as any[];

    const onProgress = vi.fn();
    await importFilesToCache(files, 'test-model', 'test-cache', onProgress);

    expect(mockCaches.open).toHaveBeenCalledWith('test-cache');
    expect(mockCache.put).toHaveBeenCalledTimes(2);

    expect(mockCache.put).toHaveBeenCalledWith(
      'https://huggingface.co/mlc-ai/test-model/resolve/main/config.json',
      expect.any(Object)
    );
    expect(mockCache.put).toHaveBeenCalledWith(
      'https://huggingface.co/mlc-ai/test-model/resolve/main/model.bin',
      expect.any(Object)
    );

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it('should fallback to file.name if webkitRelativePath is missing', async () => {
    const files = [
      {
        name: 'tokenizer.json',
        webkitRelativePath: '',
      },
    ] as any[];

    await importFilesToCache(files, 'test-model', 'test-cache');

    expect(mockCache.put).toHaveBeenCalledWith(
      'https://huggingface.co/mlc-ai/test-model/resolve/main/tokenizer.json',
      expect.any(Object)
    );
  });

  it('should skip files where relative path resolves to empty string', async () => {
    // If we pass 'root-file.txt' as webkitRelativePath, it means it's at the root of the upload folder (which shouldn't happen usually for folder upload but can).
    // The code logic: relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
    // 'root-file.txt'.split('/') -> ['root-file.txt']
    // slice(1) -> []
    // join('/') -> ''
    // So relativePath is empty string.
    // Logic: if (!relativePath) return;
    // So it skips.

    const files = [
      {
        name: 'root-file.txt',
        webkitRelativePath: 'root-file.txt',
      },
    ] as any[];

    const onProgress = vi.fn();
    await importFilesToCache(files, 'test-model', 'test-cache', onProgress);

    expect(mockCache.put).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('should handle FileList input', async () => {
    const fileArray = [
        { name: 'f1', webkitRelativePath: 'd/f1' }
    ] as any[];

    const fileList = {
        length: 1,
        item: (i: number) => fileArray[i],
        [Symbol.iterator]: function* () { yield* fileArray; }
    } as any as FileList;

    await importFilesToCache(fileList, 'm', 'c');
    expect(mockCache.put).toHaveBeenCalledTimes(1);
  });
});
