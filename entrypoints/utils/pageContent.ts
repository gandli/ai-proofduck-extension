import { Readability } from '@mozilla/readability';

export function extractPageContent(doc: Document): string {
  try {
    // Clone the document to avoid modifying the original DOM
    const documentClone = doc.cloneNode(true) as Document;
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (article?.textContent) {
      return article.textContent.trim();
    }
  } catch (error) {
    console.warn('Readability extraction failed:', error);
  }

  // Fallback to simple body text extraction
  return doc.body.innerText.trim();
}
