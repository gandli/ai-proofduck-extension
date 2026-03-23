export function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractPageText(doc: Document) {
  const candidates = [
    doc.querySelector('article'),
    doc.querySelector('main'),
    doc.querySelector('[role="main"]'),
    doc.body,
  ];

  for (const candidate of candidates) {
    const text = normalizeText(candidate?.textContent ?? '');
    if (text.length >= 40) {
      return text;
    }
  }

  return '';
}
