/**
 * Mock for @huggingface/transformers
 */
import { vi } from 'vitest';

export const pipeline = vi.fn().mockResolvedValue(
  vi.fn().mockResolvedValue([{ translation_text: 'mock translation' }])
);

export const env = {
  allowLocalModels: false,
  useBrowserCache: true,
};