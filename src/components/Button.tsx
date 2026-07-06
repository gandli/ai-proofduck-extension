/**
 * Button: 通用按钮组件（v0.4 UI 重设计）
 *
 * variant 契约（tests/unit/components/Button.spec.tsx 断言 className 含 variant 名）：
 * - primary：品牌黄渐变 + 深墨字，用于主 CTA（翻译、保存）
 * - ghost：无背景，hover 时浅灰底，用于次要动作（清空、取消）
 * - secondary：白底 + 灰描边，用于并列次操作（测试连接、取消同级）
 *
 * v0.4 变更：
 * - primary 从 `bg-yellow-400` → `bg-brand-500`（与 icon.svg 同源 #f59f00）
 * - 新增 secondary variant
 * - 复用 .pd-btn-primary 全局类，保持 Shadow DOM 场景一致性
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

/**
 * 每个 variant 的 className 必须包含 variant 名（如 'primary'），
 * 因为 Button.spec.tsx 会断言 `btn.className.includes('primary')`。
 * 不要为了美观而删掉 'pd-btn-primary' 这种带 variant 名的类。
 *
 * 使用 Map 而非普通对象 —— 避免 eslint-plugin-security 的
 * detect-object-injection 误报（variant 是 union，实际不可能注入）。
 */
const VARIANT_CLASS: ReadonlyMap<ButtonVariant, string> = new Map([
  ['primary', 'pd-btn pd-btn-primary'],
  [
    'ghost',
    'pd-btn pd-btn-ghost bg-transparent text-ink-600 hover:bg-ink-50 hover:text-ink-800 border border-transparent',
  ],
  [
    'secondary',
    'pd-btn pd-btn-secondary bg-white text-ink-700 border border-ink-200 hover:border-ink-400 hover:text-ink-800',
  ],
]);

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  const cls = [
    VARIANT_CLASS.get(variant) ?? '',
    'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
    'disabled:opacity-55 disabled:cursor-not-allowed',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
