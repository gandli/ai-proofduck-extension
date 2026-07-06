/**
 * Popup / SidePanel / Options 三个入口的挂载烟囱测试
 *
 * M1 契约（不测业务逻辑，只保证组件能挂载、有可识别的标题）：
 * - <PopupApp /> 挂载后可见「校对鸭」标题
 * - <SidePanelApp /> 挂载后可见「校对鸭 · 侧边栏」标题 + 输入区
 * - <OptionsApp /> 挂载后可见「设置」标题
 *
 * 这些是 UI 的最小承诺：M2 之后新增内容不能移除这些锚点。
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PopupApp from '../../../entrypoints/popup/App';
import SidePanelApp from '../../../entrypoints/sidepanel/App';
import OptionsApp from '../../../entrypoints/options/App';

describe('入口渲染烟囱', () => {
  it('Popup 显示品牌标题', () => {
    render(<PopupApp />);
    expect(screen.getByText(/校对鸭|ProofDuck/i)).toBeDefined();
  });

  it('SidePanel 显示输入框（长文本主战场）', () => {
    render(<SidePanelApp />);
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('Options 显示「设置」标题', () => {
    render(<OptionsApp />);
    expect(screen.getByText(/设置|Settings/i)).toBeDefined();
  });
});
