export async function importFilesToCache(
  files: FileList | File[],
  modelId: string,
  onProgress: (count: number, total: number) => void
) {
  const cache = await caches.open('webllm/model');
  const total = files.length;
  let count = 0;
  const baseUrl = `https://huggingface.co/mlc-ai/${modelId}/resolve/main/`;

  const promises = Array.from(files).map(async (file) => {
    const relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
    if (!relativePath) return;

    const url = new URL(relativePath, baseUrl).toString();
    const response = new Response(file);
    await cache.put(url, response);

    count++;
    onProgress(count, total);
  });

  await Promise.all(promises);
}
