/**
 * Button 组件单元测试
 *
 * 契约：
 * 1. 渲染 children
 * 2. 点击触发 onClick
 * 3. disabled 时点击不触发
 * 4. variant 变体（primary / ghost）反映到 className
 * 5. 支持 aria-label（可访问性）
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@components/Button';

describe('Button', () => {
  it('渲染 children', () => {
    render(<Button>翻译</Button>);
    expect(screen.getByText('翻译')).toBeDefined();
  });

  it('点击触发 onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByText('Go'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disabled 时点击不触发', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Go</Button>);
    await user.click(screen.getByText('Go'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('variant=primary 反映到 className', () => {
    render(<Button variant="primary">A</Button>);
    const btn = screen.getByText('A');
    expect(btn.className).toContain('primary');
  });

  it('variant=ghost 反映到 className', () => {
    render(<Button variant="ghost">B</Button>);
    const btn = screen.getByText('B');
    expect(btn.className).toContain('ghost');
  });

  it('aria-label 透传', () => {
    render(<Button aria-label="翻译按钮">🦆</Button>);
    expect(screen.getByLabelText('翻译按钮')).toBeDefined();
  });
});
