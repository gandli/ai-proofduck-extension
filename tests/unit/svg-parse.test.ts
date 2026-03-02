import { describe, it, expect } from 'vitest';
import { SVG_STRING } from '../../entrypoints/assets/floatingIcon';
import { JSDOM } from 'jsdom';

describe('SVG Parsing', () => {
  it('should parse SVG_STRING without errors', () => {
    const dom = new JSDOM();
    const parser = new dom.window.DOMParser();
    const svgDoc = parser.parseFromString(SVG_STRING.trim(), 'image/svg+xml');
    
    const parserError = svgDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      console.error('Parser Error:', parserError[0].textContent);
    }
    
    expect(parserError.length).toBe(0);
    expect(svgDoc.documentElement.nodeName).toBe('svg');
    expect(svgDoc.documentElement.getAttribute('height')).toBe('24');
  });
});
