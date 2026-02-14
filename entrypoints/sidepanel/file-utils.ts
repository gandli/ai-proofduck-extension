export async function importFilesToCache(
  files: FileList | File[],
  modelId: string,
  cacheName: string,
  onProgress?: (count: number, total: number) => void
): Promise<void> {
  const cache = await caches.open(cacheName);
  const total = files.length;
  let count = 0;

  const baseUrl = `https://huggingface.co/mlc-ai/${modelId}/resolve/main/`;
  const fileArray = Array.from(files);

  // Process files in parallel to speed up import
  await Promise.all(
    fileArray.map(async (file) => {
      // webkitRelativePath is specific to folder uploads
      // In a real browser environment with folder selection, this property is present.
      const relativePath = (file as any).webkitRelativePath
        ? (file as any).webkitRelativePath.split('/').slice(1).join('/')
        : file.name;

      if (!relativePath) return;

      const url = new URL(relativePath, baseUrl).toString();
      const response = new Response(file);
      await cache.put(url, response);

      count++;
      if (onProgress) {
        onProgress(count, total);
      }
    })
  );
}
