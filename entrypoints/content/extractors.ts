export function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

const MIN_FULL_PAGE_TEXT_LENGTH = 12;

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

export function extractFullPageText(doc: Document) {
  const clonedBody = doc.body?.cloneNode(true) as HTMLElement | null;
  if (!clonedBody) {
    return '';
  }

  clonedBody.querySelectorAll('script, style, noscript, template').forEach((element) => element.remove());
  const text = normalizeText(clonedBody.textContent ?? '');

  return text.length >= MIN_FULL_PAGE_TEXT_LENGTH ? text : '';
}
