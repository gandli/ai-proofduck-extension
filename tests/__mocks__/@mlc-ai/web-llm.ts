/**
 * Mock for @mlc-ai/web-llm
 */
import { vi } from 'vitest';

export const CreateChatModule = vi.fn().mockResolvedValue({
  prefill: vi.fn(),
  generate: vi.fn().mockResolvedValue('mock translation'),
  expressCurrentGeneratedText: vi.fn().mockReturnValue(''),
  resetChat: vi.fn(),
  unload: vi.fn(),
});