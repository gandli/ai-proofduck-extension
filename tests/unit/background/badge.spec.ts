import { describe, it, expect, vi } from 'vitest';
import { applyBadge } from '../../../src/background/badge';

describe('applyBadge · v0.5.2 图标状态', () => {
  it('ready → 清空 badge 文本', () => {
    const setBadgeText = vi.fn();
    const setBadgeBackgroundColor = vi.fn();
    const setTitle = vi.fn();
    applyBadge('ready', { setBadgeText, setBadgeBackgroundColor, setTitle });
    expect(setBadgeText).toHaveBeenCalledWith({ text: '' });
    expect(setTitle).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('就绪') }));
  });

  it('warn → 橙色 "!" badge', () => {
    const setBadgeText = vi.fn();
    const setBadgeBackgroundColor = vi.fn();
    const setTitle = vi.fn();
    applyBadge('warn', { setBadgeText, setBadgeBackgroundColor, setTitle });
    expect(setBadgeText).toHaveBeenCalledWith({ text: '!' });
    expect(setBadgeBackgroundColor).toHaveBeenCalled();
    const color = setBadgeBackgroundColor.mock.calls[0][0].color;
    expect(color).toMatch(/^#[0-9A-Fa-f]{6,8}$/);
    expect(setTitle.mock.calls[0][0].title).toContain('需配置');
  });

  it('error → 红色 "×" badge', () => {
    const setBadgeText = vi.fn();
    const setBadgeBackgroundColor = vi.fn();
    applyBadge('error', { setBadgeText, setBadgeBackgroundColor });
    expect(setBadgeText).toHaveBeenCalledWith({ text: '×' });
    // 红色 → red 分量应显著大于 green/blue
    const color = setBadgeBackgroundColor.mock.calls[0][0].color;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    expect(r).toBeGreaterThan(g);
  });

  it('传入 undefined action 静默不抛错', () => {
    expect(() => applyBadge('warn', undefined)).not.toThrow();
  });

  it('setBadgeBackgroundColor / setTitle 缺失时不抛错（兼容早期 chrome API）', () => {
    const setBadgeText = vi.fn();
    expect(() => applyBadge('warn', { setBadgeText })).not.toThrow();
    expect(setBadgeText).toHaveBeenCalled();
  });
});
