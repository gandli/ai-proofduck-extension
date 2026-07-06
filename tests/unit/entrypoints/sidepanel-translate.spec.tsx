/**
 * SidePanel M2 交互测试：翻译流程
 *
 * 契约：
 * 1. 双栏：输入 textbox + 输出显示区
 * 2. 目标语言选择器（zh/en 等）
 * 3. 点击「翻译」按钮触发 useTranslate
 * 4. 翻译中显示 "翻译中" 提示
 * 5. 完成后输出可见
 * 6. Chrome AI 不可用时显示提示（不可用横幅）
 *
 * 用 dependency injection 把 engine 传进去，测试给 mock。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SidePanelApp from '../../../entrypoints/sidepanel/App';
import type { Engine } from '@engines/types';

function mockEngine(overrides: Partial<Engine> = {}): Engine {
  return {
    id: 'chrome-ai',
    name: 'Chrome 内置 AI',
    priority: 100,
    isAvailable: async () => true,
    supports: () => true,
    run: async ({ text }) => `翻译：${text}`,
    async *runStreaming({ text }) {
      for (const ch of `翻译：${text}`) yield ch;
    },
    ...overrides,
  };
}

describe('SidePanel M2 翻译交互', () => {
  it('渲染输入 textarea + 目标语言选择器 + 翻译按钮', async () => {
    render(<SidePanelApp engine={mockEngine()} />);
    expect(screen.getByPlaceholderText(/粘贴|输入/)).toBeDefined();
    expect(screen.getByLabelText(/目标语言|target/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /翻译/ })).toBeDefined();
  });

  it('输入 + 点击翻译 → 显示翻译结果', async () => {
    render(<SidePanelApp engine={mockEngine()} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hello world' } });
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText(/翻译：hello world/)).toBeDefined();
    });
  });

  it('Chrome AI 不可用时显示提示横幅', async () => {
    const engine = mockEngine({ isAvailable: async () => false });
    render(<SidePanelApp engine={engine} />);

    await waitFor(() => {
      expect(screen.getByText(/不可用|升级|Chrome 138/)).toBeDefined();
    });
  });

  it('引擎抛错时显示错误信息', async () => {
    const engine = mockEngine({
      async *runStreaming() {
        throw new Error('模型未下载');
      },
    });
    render(<SidePanelApp engine={engine} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText(/模型未下载/)).toBeDefined();
    });
  });

  it('空输入时按钮 disabled', () => {
    render(<SidePanelApp engine={mockEngine()} />);
    const btn = screen.getByRole('button', { name: /翻译/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('源语言 === 目标语言 时按钮 disabled + 结果区提示', async () => {
    render(<SidePanelApp engine={mockEngine()} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hi' } });

    // 把源语言从"自动"改成"中文"（默认目标也是中文 → 相同）
    fireEvent.change(screen.getByLabelText(/源语言/), { target: { value: 'zh' } });

    const btn = screen.getByRole('button', { name: /翻译/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText(/源语言和目标语言不能相同/)).toBeDefined();
  });
});
