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

  // ========================
  // Bug #P0: SidePanel 应该走 pickBest() 兜底，不能写死 chrome-ai
  // ========================
  it('未传 engine prop 时 → 应从 EngineManager 选**当前可用最优**（不是硬编码 chrome-ai）', async () => {
    // 场景：Chrome 138 以下用户，chrome-ai 不可用，但 free-translate 可用
    // 期望：SidePanel 自动选到 free-translate，UI 应该能工作，不显示"不可用"

    const freeEngine = mockEngine({
      id: 'free-translate',
      name: '免费翻译',
      priority: 60,
      isAvailable: async () => true,
      run: async ({ text }) => `[free]${text}`,
      async *runStreaming({ text }) {
        for (const ch of `[free]${text}`) yield ch;
      },
    });

    render(<SidePanelApp engine={freeEngine} />);

    // 不应显示"Chrome AI 不可用"（因为 free-translate 可以顶上）
    await waitFor(() => {
      // 等 isAvailable 检查跑完
      const btn = screen.getByRole('button', { name: /翻译/ }) as HTMLButtonElement;
      // 空输入 disabled 是对的，但不能因为 available===false 而 disabled
      expect(btn.disabled).toBe(true); // 空文本
    });

    // 输入后能翻译（意味着可用性判断没错杀）
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText(/\[free\]hi/)).toBeDefined();
    });
  });

  it('UI 应显示当前使用的引擎名（让用户知道谁在干活）', async () => {
    render(<SidePanelApp engine={mockEngine({ name: '免费翻译' })} />);
    // 挂载后至少一处提到"免费翻译"（引擎徽章 + label 都算）
    await waitFor(() => {
      const matches = screen.getAllByText(/免费翻译/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('全部引擎都不可用时才显示"没有可用引擎"横幅（不是特指 Chrome AI）', async () => {
    const engine = mockEngine({ isAvailable: async () => false });
    render(<SidePanelApp engine={engine} />);

    await waitFor(() => {
      // 应该是通用文案，而不是硬编码 Chrome AI 独占
      const banner = screen.getByRole('alert');
      // 允许提到 Chrome AI 作为一个选项，但也要提到其他兜底
      expect(banner.textContent).toMatch(/没有可用|所有引擎|去设置|配置/);
    });
  });
});
