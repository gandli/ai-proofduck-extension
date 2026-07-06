/**
 * FreeTranslateSection 组件测试
 *
 * 契约：
 * 1. 首次挂载读取 freeTranslate.enabled，回填开关状态
 * 2. 切换开关 → 调用 storage.set 写回
 * 3. 显示隐私说明文字（提醒用户会发送到 Google 服务器）
 * 4. 默认状态是"开启"（storage 默认值 true）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FreeTranslateSection } from '@components/FreeTranslateSection';

// mock storage
const state = { enabled: true };
vi.mock('@core/storage', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    defineStorage: (_key: string, defaultValue: unknown) => ({
      get: vi.fn(async () => state.enabled ?? defaultValue),
      set: vi.fn(async (v: unknown) => {
        state.enabled = v as boolean;
      }),
      watch: vi.fn(() => () => {}),
    }),
  };
});

describe('FreeTranslateSection', () => {
  beforeEach(() => {
    state.enabled = true;
  });

  it('默认展示开关为"开启"', async () => {
    render(<FreeTranslateSection />);
    const toggle = await screen.findByRole('switch', { name: /启用免费翻译兜底/i });
    expect(toggle).toBeChecked();
  });

  it('storage 里是 false → 显示"关闭"', async () => {
    state.enabled = false;
    render(<FreeTranslateSection />);
    const toggle = await screen.findByRole('switch', { name: /启用免费翻译兜底/i });
    expect(toggle).not.toBeChecked();
  });

  it('点击开关 → 状态翻转并写回 storage', async () => {
    const user = userEvent.setup();
    render(<FreeTranslateSection />);
    const toggle = await screen.findByRole('switch', { name: /启用免费翻译兜底/i });
    expect(toggle).toBeChecked();

    await user.click(toggle);
    await waitFor(() => {
      expect(state.enabled).toBe(false);
    });
    expect(toggle).not.toBeChecked();
  });

  it('显示隐私提醒（提到 Google）', async () => {
    render(<FreeTranslateSection />);
    // 等挂载完成
    await screen.findByRole('switch');
    // 段落里两处提到 Google（"Google 公开翻译端点" + "Google 服务器"），只要有就 OK
    expect(screen.getAllByText(/Google/i).length).toBeGreaterThan(0);
  });
});
