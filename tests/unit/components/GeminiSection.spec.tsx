/** GeminiSection Options 页组件测试 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// fakeBrowser 提供 chrome 全局，需补 storage API
const mockSet = vi.fn(async () => {});
beforeEach(() => {
  const _chrome = (globalThis as { chrome?: Record<string, unknown> }).chrome ?? {};
  (globalThis as { chrome?: Record<string, unknown> }).chrome = {
    ..._chrome,
    storage: {
      ...(_chrome.storage as Record<string, unknown> ?? {}),
      local: {
        get: async () => ({ geminiConfig: undefined }),
        set: mockSet,
      },
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

import { GeminiSection } from '@components/GeminiSection';

describe('GeminiSection', () => {
  it('首屏显示 skeleton，随后加载表单', async () => {
    const { container } = render(<GeminiSection />);
    // skeleton: aria-busy=true
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Gemini API')).toBeInTheDocument();
    });
  });

  it('填 API Key 后点保存 → storage.set 被调用', async () => {
    const user = userEvent.setup();
    render(<GeminiSection />);
    await screen.findByText('Gemini API');

    const input = screen.getByLabelText('API Key');
    await user.type(input, 'AIzaSyTest');

    const saveBtn = screen.getByRole('button', { name: /保存/ });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith({
        geminiConfig: { apiKey: 'AIzaSyTest', model: 'gemini-2.0-flash' },
      });
    });
  });

  it('保存后显示"已保存"提示', async () => {
    const user = userEvent.setup();
    render(<GeminiSection />);
    await screen.findByText('Gemini API');

    await user.type(screen.getByLabelText('API Key'), 'test-key');
    await user.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(screen.getByText(/已保存/)).toBeInTheDocument();
    });
  });
});
