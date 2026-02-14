// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractPageContent } from '../pageContent';
import { Readability } from '@mozilla/readability';

// Mock Readability
vi.mock('@mozilla/readability', () => {
  return {
    Readability: vi.fn()
  };
});

describe('extractPageContent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should return Readability content if parsing succeeds', () => {
    const mockContent = 'Extracted Content';
    // Setup mock return using a function to allow 'new'
    (Readability as unknown as any).mockImplementation(function() {
      return {
        parse: () => ({ textContent: mockContent })
      };
    });

    document.body.innerText = 'Fallback Content';

    const result = extractPageContent(document);
    expect(result).toBe(mockContent);
  });

  it('should fallback to body.innerText if Readability returns null', () => {
    // Setup mock return null
    (Readability as unknown as any).mockImplementation(function() {
      return {
        parse: () => null
      };
    });

    document.body.innerText = 'Fallback Content';

    const result = extractPageContent(document);
    expect(result).toBe('Fallback Content');
  });

  it('should fallback to body.innerText if Readability throws', () => {
    // Setup mock throw
    (Readability as unknown as any).mockImplementation(function() {
      return {
        parse: () => { throw new Error('Parse error'); }
      };
    });

    document.body.innerText = 'Fallback Content';

    const result = extractPageContent(document);
    expect(result).toBe('Fallback Content');
  });
});
