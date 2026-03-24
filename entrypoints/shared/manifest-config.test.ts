import { describe, expect, it } from 'vitest';

import config from '../../wxt.config';
import { EXTENSION_PAGE_CSP } from './manifest-config';

describe('extension manifest content security policy', () => {
  it('allows wasm-backed local models on extension pages', () => {
    const manifest = config.manifest as {
      content_security_policy?: {
        extension_pages?: string;
      };
    };

    expect(EXTENSION_PAGE_CSP).toContain("'wasm-unsafe-eval'");
    expect(manifest.content_security_policy?.extension_pages).toBe(EXTENSION_PAGE_CSP);
  });
});
