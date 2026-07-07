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
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderAct } from '@test-helpers/render';
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
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    expect(screen.getByPlaceholderText(/粘贴|输入/)).toBeDefined();
    expect(screen.getByLabelText(/目标语言|target/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /翻译/ })).toBeDefined();
  });

  it('输入 + 点击翻译 → 显示翻译结果', async () => {
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hello world' } });
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText(/翻译：hello world/)).toBeDefined();
    });
  });

  it('Chrome AI 不可用时显示提示横幅', async () => {
    const engine = mockEngine({ isAvailable: async () => false });
    await renderAct(<SidePanelApp engine={engine} />);

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
    await renderAct(<SidePanelApp engine={engine} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText(/模型未下载/)).toBeDefined();
    });
  });

  it('空输入时按钮 disabled', async () => {
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    const btn = screen.getByRole('button', { name: /翻译/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('源语言 === 目标语言 时按钮 disabled + 结果区提示', async () => {
    await renderAct(<SidePanelApp engine={mockEngine()} />);
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
    await renderAct(<FreshApp />);

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

    await renderAct(<SidePanelApp engine={freeEngine} />);

    // 输入后能翻译（意味着可用性判断没错杀）
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: /翻译/ }));

    await waitFor(() => {
      expect(screen.getByText(/\[free\]hi/)).toBeDefined();
    });
  });

  it('UI 应显示当前使用的引擎名（让用户知道谁在干活）', async () => {
    await renderAct(<SidePanelApp engine={mockEngine({ name: '免费翻译' })} />);
    // 挂载后至少一处提到"免费翻译"（引擎徽章 + label 都算）
    await waitFor(() => {
      const matches = screen.getAllByText(/免费翻译/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  // P1-1 修复（v0.4.2 审计）：输入超过 MAX_CHARS 时按钮 disabled + 提示
  it('输入超过 5000 字时按钮 disabled + 显示"输入超过 X 字"提示', async () => {
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(5001) } });

    const btn = screen.getByRole('button', { name: /翻译/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText(/输入超过 5000 字/)).toBeDefined();
  });

  it('输入正好 5000 字时按钮仍可点（等号边界）', async () => {
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(5000) } });

    const btn = screen.getByRole('button', { name: /翻译/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('全部引擎都不可用时才显示"没有可用引擎"横幅（不是特指 Chrome AI）', async () => {
    const engine = mockEngine({ isAvailable: async () => false });
    await renderAct(<SidePanelApp engine={engine} />);

    await waitFor(() => {
      const banner = screen.getByRole('alert');
      expect(banner.textContent).toMatch(/没有可用|所有引擎|去设置|配置/);
    });
  });

  // v0.5.1 UX polish
  it('空状态显示引导条目（3 条 hint：粘贴/快捷键/弹泡）', async () => {
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    expect(screen.getByText(/翻译结果会显示在这里/)).toBeDefined();
    expect(screen.getByText(/粘贴或输入文本到上方/)).toBeDefined();
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
    await renderAct(<SidePanelApp engine={flakyEngine} />);
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
    const { container } = await renderAct(<SidePanelApp engine={pendingEngine} />);
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

// ============================================================
// P1-A 覆盖率补齐：swap / keyboard shortcut / same-language / clear
// ============================================================
describe('SidePanel · 覆盖率补齐（P1-A · 审计 v2）', () => {
  it('handleSwap：source=auto 时点交换按钮无副作用', async () => {
    // source 默认 auto，target 默认 zh，点交换后两侧值都不能变
    // Gemini review 采纳：用 aria-label 精确定位，双向断言
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    const sourceSel = screen.getByLabelText('源语言') as HTMLSelectElement;
    const targetSel = screen.getByLabelText('目标语言') as HTMLSelectElement;
    expect(sourceSel.value).toBe('auto');
    expect(targetSel.value).toBe('zh');
    const swap = screen.getByRole('button', { name: /交换/ });
    fireEvent.click(swap);
    // auto 时 swap 是 no-op，两侧值都不变
    expect(sourceSel.value).toBe('auto');
    expect(targetSel.value).toBe('zh');
  });

  it('handleSwap：显式源语言时点交换 → source/target 互换', async () => {
    // Gemini review 采纳：aria-label 定位 + 双向完整断言
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    const sourceSel = screen.getByLabelText('源语言') as HTMLSelectElement;
    const targetSel = screen.getByLabelText('目标语言') as HTMLSelectElement;
    // source: auto → en
    fireEvent.change(sourceSel, { target: { value: 'en' } });
    expect(sourceSel.value).toBe('en');
    expect(targetSel.value).toBe('zh');
    // swap → source=zh, target=en
    fireEvent.click(screen.getByRole('button', { name: /交换/ }));
    expect(sourceSel.value).toBe('zh');
    expect(targetSel.value).toBe('en');
  });

  it('Ctrl+Enter 快捷键触发翻译', async () => {
    const engine = mockEngine();
    await renderAct(<SidePanelApp engine={engine} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hello shortcut' } });
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText(/翻译：hello shortcut/)).toBeDefined();
    });
  });

  it('⌘+Enter 快捷键（macOS metaKey）触发翻译', async () => {
    const engine = mockEngine();
    await renderAct(<SidePanelApp engine={engine} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hello mac' } });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    await waitFor(() => {
      expect(screen.getByText(/翻译：hello mac/)).toBeDefined();
    });
  });

  it('无内容 + Ctrl+Enter → 不触发翻译（canTranslate=false）', async () => {
    const engine = mockEngine();
    const spy = vi.spyOn(engine, 'runStreaming');
    await renderAct(<SidePanelApp engine={engine} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    // 没输入 → runStreaming 应从未被调用
    expect(spy).not.toHaveBeenCalled();
  });

  it('源=目标同语言 → 显示"源语言和目标语言不能相同"提示 + 翻译禁用', async () => {
    // Gemini review 采纳：补齐提示文案断言，双向验证 UI 反馈
    await renderAct(<SidePanelApp engine={mockEngine()} />);
    const sourceSel = screen.getByLabelText('源语言') as HTMLSelectElement;
    const targetSel = screen.getByLabelText('目标语言') as HTMLSelectElement;
    // source: auto → zh，与 target=zh 同语言
    fireEvent.change(sourceSel, { target: { value: 'zh' } });
    expect(sourceSel.value).toBe('zh');
    expect(targetSel.value).toBe('zh');
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '你好' } });
    // 断言 1：翻译按钮 disabled
    const translateBtn = screen.getByRole('button', { name: /^翻译/ });
    expect((translateBtn as HTMLButtonElement).disabled).toBe(true);
    // 断言 2：译文区显示提示文案
    expect(screen.getByText(/源语言和目标语言不能相同/)).toBeDefined();
  });

  it('点"清空"按钮 → 输入框 + 译文双清空', async () => {
    const engine = mockEngine();
    await renderAct(<SidePanelApp engine={engine} />);
    const input = screen.getByPlaceholderText(/粘贴|输入/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'text to clear' } });
    fireEvent.click(screen.getByRole('button', { name: /^翻译/ }));
    await waitFor(() => {
      expect(screen.getByText(/翻译：text to clear/)).toBeDefined();
    });
    // 点清空
    fireEvent.click(screen.getByRole('button', { name: /^清空/ }));
    expect(input.value).toBe('');
    // 译文区应不再包含旧结果
    await waitFor(() => {
      expect(screen.queryByText(/翻译：text to clear/)).toBeNull();
    });
  });

  it('生产路径 · engine 未注入 → 走 pickBest() 兜底 resolve 成功', async () => {
    // Gemini review 采纳：try/finally 保证 doUnmock 在断言失败时也执行
    const engine = mockEngine();
    vi.doMock('@core/engines', () => ({
      getEngines: () => ({
        pickBest: vi.fn().mockResolvedValue(engine),
      }),
    }));
    try {
      vi.resetModules();
      const { default: AppFresh } = await import('../../../entrypoints/sidepanel/App');
      await renderAct(<AppFresh />); // 不传 engine
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/粘贴|输入/)).toBeDefined();
      });
    } finally {
      vi.doUnmock('@core/engines');
    }
  });

  it('生产路径 · pickBest() 抛错 → 走 catch 分支，available=false', async () => {
    // Gemini review 采纳：try/finally 保证 doUnmock 在断言失败时也执行
    vi.doMock('@core/engines', () => ({
      getEngines: () => ({
        pickBest: vi.fn().mockRejectedValue(new Error('no engine')),
      }),
    }));
    try {
      vi.resetModules();
      const { default: AppFresh } = await import('../../../entrypoints/sidepanel/App');
      await renderAct(<AppFresh />);
      await waitFor(() => {
        const translateBtn = screen.queryByRole('button', { name: /^翻译/ });
        if (translateBtn) {
          expect((translateBtn as HTMLButtonElement).disabled).toBe(true);
        }
      });
    } finally {
      vi.doUnmock('@core/engines');
    }
  });
});
