export interface ImportProgressTranslations {
  importing: string;
}

export async function importMLCPackage(
  file: File,
  t: ImportProgressTranslations,
  onProgress: (progress: number, text: string) => void
): Promise<void> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const decoder = new TextDecoder();

  if (view.getUint32(0) !== 0x4d4c4350) {
    throw new Error('Invalid MLCP file format');
  }

  const fileCount = view.getUint32(4);
  const cache = await caches.open('webllm/model');

  let offset = 8;
  const entries: { url: string; data: Uint8Array }[] = [];

  for (let i = 0; i < fileCount; i++) {
    const urlLen = view.getUint32(offset);
    const url = decoder.decode(new Uint8Array(buffer, offset + 4, urlLen));
    offset += 4 + urlLen;

    const size = Number(view.getBigUint64(offset));
    const data = new Uint8Array(buffer, offset + 8, size);
    offset += 8 + size;

    entries.push({ url, data });
  }

  let completed = 0;
  await Promise.all(entries.map(async ({ url, data }) => {
    await cache.put(url, new Response(data as BodyInit));
    completed++;
    onProgress(
      (completed / fileCount) * 100,
      `${t.importing} (${completed}/${fileCount})`
    );
  }));
}
