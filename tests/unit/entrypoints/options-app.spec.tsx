/**
 * OptionsApp 行为单测 · 补齐 coverage（P1-3 修复的一部分）
 *
 * 覆盖点：
 * - 主题/语言 select 变更走 setter
 * - 默认引擎 select 变更走 setter
 * - 引擎健康度：isAvailable=true → 显示 ok 提示；isAvailable=false → 显示 err 提示
 * - free-translate 健康度受 freeEnabled 控制
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// mock stores
const setThemeMock = vi.fn();
const setLocaleMock = vi.fn();
const setDefaultEngineMock = vi.fn();
const useSettingsStoreMock = vi.fn(() => ({
  theme: 'system' as const,
  locale: 'zh-CN' as const,
  defaultEngine: 'auto' as const,
  freeTranslateEnabled: true,
  setTheme: setThemeMock,
  setLocale: setLocaleMock,
  setDefaultEngine: setDefaultEngineMock,
}));

vi.mock('@stores/settings', () => ({
  useSettingsStore: () => useSettingsStoreMock(),
}));

// mock 引擎 registry — 4 引擎全 available
const engineList = [
  {
    id: 'chrome-ai',
    name: 'Chrome AI',
    priority: 100,
    isAvailable: vi.fn().mockResolvedValue(true),
    supports: () => true,
    run: async () => 'x',
  },
  {
    id: 'webllm',
    name: 'WebLLM',
    priority: 90,
    isAvailable: vi.fn().mockResolvedValue(false), // 关键：不可用
    supports: () => true,
    run: async () => 'x',
  },
  {
    id: 'openai-compat',
    name: 'OpenAI 兼容',
    priority: 70,
    isAvailable: vi.fn().mockRejectedValue(new Error('no config')), // 抛错路径
    supports: () => true,
    run: async () => 'x',
  },
  {
    id: 'free-translate',
    name: '免费翻译',
    priority: 60,
    isAvailable: vi.fn().mockResolvedValue(true),
    supports: () => true,
    run: async () => 'x',
  },
];

vi.mock('@core/engines', () => ({
  getEngines: () => ({
    list: () => engineList,
    pickBest: vi.fn(),
    pickById: vi.fn(),
    register: vi.fn(),
  }),
}));

// 简化子组件，避免 storage/chrome API 副作用
vi.mock('@components/OpenAiCompatSection', () => ({
  OpenAiCompatSection: () => <div data-testid="oai-section-stub">oai-section</div>,
}));
vi.mock('@components/FreeTranslateSection', () => ({
  FreeTranslateSection: () => <div data-testid="free-section-stub">free-section</div>,
}));

import OptionsApp from '../../../entrypoints/options/App';

describe('OptionsApp 行为', () => {
  beforeEach(() => {
    setThemeMock.mockReset();
    setLocaleMock.mockReset();
    setDefaultEngineMock.mockReset();
  });

  it('渲染标题 + 3 个 select（主题/语言/默认引擎）', () => {
    render(<OptionsApp />);
    expect(screen.getByText('设置')).toBeDefined();
    expect(screen.getByLabelText('主题')).toBeDefined();
    expect(screen.getByLabelText('界面语言')).toBeDefined();
    expect(screen.getByLabelText('默认引擎')).toBeDefined();
  });

  it('切换主题 → 调用 setTheme', () => {
    render(<OptionsApp />);
    fireEvent.change(screen.getByLabelText('主题'), { target: { value: 'dark' } });
    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('切换语言 → 调用 setLocale', () => {
    render(<OptionsApp />);
    fireEvent.change(screen.getByLabelText('界面语言'), { target: { value: 'en' } });
    expect(setLocaleMock).toHaveBeenCalledWith('en');
  });

  it('切换默认引擎 → 调用 setDefaultEngine', () => {
    render(<OptionsApp />);
    fireEvent.change(screen.getByLabelText('默认引擎'), { target: { value: 'chrome-ai' } });
    expect(setDefaultEngineMock).toHaveBeenCalledWith('chrome-ai');
  });

  it('引擎健康度：chrome-ai=ok / webllm=err / openai=err（抛错） / free=ok（启用）', async () => {
    render(<OptionsApp />);

    // 等 4 个 isAvailable 全部 resolve
    await waitFor(() => {
      expect(screen.getByText('引擎健康度')).toBeDefined();
      // ok 状态一定有一处（chrome-ai）
      const okDots = document.querySelectorAll('.pd-dot-ok');
      const errDots = document.querySelectorAll('.pd-dot-err');
      expect(okDots.length).toBeGreaterThanOrEqual(1);
      expect(errDots.length).toBeGreaterThanOrEqual(1);
    });

    // 明确文案分支
    expect(screen.getByText(/设备端就绪/)).toBeDefined(); // chrome-ai ok
    expect(screen.getByText(/WebGPU 不可用/)).toBeDefined(); // webllm err
    expect(screen.getByText(/未配置/)).toBeDefined(); // openai catch → err
    expect(screen.getByText(/已启用/)).toBeDefined(); // free ok
  });

  it('free-translate 健康度默认显示"已启用"（freeTranslate.enabled 默认 true）', async () => {
    // 该字段从 defineStorage('freeTranslate.enabled', true, {sync}) 读取，
    // 默认值就是 true，测试环境走默认 → hint="已启用"
    render(<OptionsApp />);

    await waitFor(() => {
      expect(screen.getByText(/已启用/)).toBeDefined();
    });
  });
});
