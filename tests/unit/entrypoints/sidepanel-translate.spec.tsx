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
  it('未传 engine prop 时 → 应调用 EngineManager.pickBest() 而非 pickById（Gemini review）', async () => {
    // 这个测试真正覆盖 P0 修复：不传 engine，mock getEngines 拿 pickBest 调用凭据
    const pickBest = vi.fn().mockResolvedValue({
      id: 'free-translate',
      name: '免费翻译',
      priority: 60,
      isAvailable: async () => true,
      supports: () => true,
      run: async ({ text }: { text: string }) => `[free]${text}`,
      async *runStreaming({ text }: { text: string }) {
        for (const ch of `[free]${text}`) yield ch;
      },
    });
    const pickById = vi.fn().mockReturnValue(null);
    vi.doMock('@core/engines', () => ({
      getEngines: () => ({ pickBest, pickById, register: vi.fn(), list: () => [] }),
      _resetEnginesForTest: () => {},
    }));

    // 重新 import 让 doMock 生效
    vi.resetModules();
    const mod = await import('../../../entrypoints/sidepanel/App');
    const FreshApp = mod.default;
    render(<FreshApp />);

    await waitFor(() => {
      // 关键契约：pickBest 被调用，pickById 不该被调用
      expect(pickBest).toHaveBeenCalled();
      expect(pickById).not.toHaveBeenCalled();
    });

    vi.doUnmock('@core/engines');
    vi.resetModules();
  });

  it('传入 engine prop 时 → 应直接用它，不查 EngineManager（DI 路径）', async () => {
    // 保底：DI 路径不能意外走 EngineManager
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

  // P1-1 修复（v0.4.2 审计）：输入超过 MAX_CHARS 时按钮 disabled + 提示
  it('输入超过 5000 字时按钮 disabled + 显示"输入超过 X 字"提示', () => {
    render(<SidePanelApp engine={mockEngine()} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(5001) } });

    const btn = screen.getByRole('button', { name: /翻译/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText(/输入超过 5000 字/)).toBeDefined();
  });

  it('输入正好 5000 字时按钮仍可点（等号边界）', () => {
    render(<SidePanelApp engine={mockEngine()} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(5000) } });

    const btn = screen.getByRole('button', { name: /翻译/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('全部引擎都不可用时才显示"没有可用引擎"横幅（不是特指 Chrome AI）', async () => {
    const engine = mockEngine({ isAvailable: async () => false });
    render(<SidePanelApp engine={engine} />);

    await waitFor(() => {
      const banner = screen.getByRole('alert');
      expect(banner.textContent).toMatch(/没有可用|所有引擎|去设置|配置/);
    });
  });

  // v0.5.1 UX polish
  it('空状态显示引导条目（3 条 hint：粘贴/快捷键/弹泡）', () => {
    render(<SidePanelApp engine={mockEngine()} />);
    expect(screen.getByText(/翻译结果会显示在这里/)).toBeDefined();
    expect(screen.getByText(/粘贴或输入文本到左侧/)).toBeDefined();
    expect(screen.getByText(/快速翻译/)).toBeDefined();
    expect(screen.getByText(/弹泡也会自动翻译/)).toBeDefined();
  });

  it('错误态显示"重试"按钮，点击触发重新翻译', async () => {
    let callCount = 0;
    const flakyEngine = mockEngine({
      async *runStreaming({ text: _t }: { text: string }) {
        callCount++;
        if (callCount === 1) throw new Error('网络断了');
        yield '恢复成功';
      },
    });
    render(<SidePanelApp engine={flakyEngine} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    // 用独特文本避免 module-level cache 命中前测试残留
    fireEvent.change(input, { target: { value: 'retry-test-unique-abc' } });
    fireEvent.click(screen.getByRole('button', { name: /^翻译/ }));

    // 等错误态出现
    const retryBtn = await screen.findByRole('button', { name: /^重试/ });
    expect(retryBtn).toBeDefined();

    // 点重试
    fireEvent.click(retryBtn);
    await waitFor(() => {
      expect(screen.getByText('恢复成功')).toBeDefined();
    });
  });

  it('加载态渲染骨架块而非 ⏳ emoji（品牌禁用 emoji）', async () => {
    const pendingEngine = mockEngine({
      async *runStreaming({ text: _t }: { text: string }) {
        await new Promise(() => {}); // 永挂
        yield '';
      },
    });
    const { container } = render(<SidePanelApp engine={pendingEngine} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    // 独特文本避 cache
    fireEvent.change(input, { target: { value: 'loading-test-unique-xyz' } });
    fireEvent.click(screen.getByRole('button', { name: /^翻译/ }));

    await waitFor(() => {
      const skeleton = container.querySelectorAll('.pd-skeleton-line');
      expect(skeleton.length).toBe(3);
      const output = container.querySelector('[aria-label="翻译结果"]');
      expect(output?.getAttribute('aria-busy')).toBe('true');
      expect(output?.textContent).not.toContain('⏳');
    });
  });
});
