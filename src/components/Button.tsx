/**
 * Button: 通用按钮组件
 *
 * M1 只做骨架 + variant className 拼接；样式细节由 Tailwind 后续填充。
 * 关键设计：
 * - 直接透传 native button props（type、disabled、aria-* 一把过）
 * - variant 通过 className 暴露给 vitest 断言，便于后续 refactor CSS 时保留契约
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'pd-btn pd-btn-primary bg-yellow-400 text-black hover:bg-yellow-500',
  ghost: 'pd-btn pd-btn-ghost bg-transparent text-current hover:bg-black/5',
};

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  const cls = [VARIANT_CLASS[variant], 'px-3 py-1.5 rounded-md text-sm font-medium', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
