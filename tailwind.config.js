/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{html,ts,tsx}",
    "./src/**/*.{html,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * === 校对鸭品牌色（与 public/icon.svg 完全一致） ===
         *
         * icon.svg 渐变:
         *   background: linear-gradient(135deg, #fff9db → #f59f00)
         *   stroke:     #495057
         *
         * scale 参考 Mantine 设计系统的 yellow palette，保证：
         * - brand-100 ↔ icon 渐变起点
         * - brand-500 ↔ icon 主色
         * - ink-900   ↔ icon 描边
         */
        brand: {
          50:  '#fffbea',
          100: '#fff9db',   // icon 渐变起点
          200: '#ffec99',
          300: '#ffd43b',
          400: '#fcc419',
          500: '#f59f00',   // icon 主色（品牌黄）
          600: '#d68b00',
          700: '#a56501',
          800: '#7d4c00',
          900: '#553300',
        },
        ink: {
          50:  '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',   // icon 描边
          700: '#343a40',
          800: '#212529',
          900: '#1a1d20',
        },
        /**
         * v0.4.2 米色樱粉方案 —— 与 style.css 的 --beige-* / --sakura-* / --duck-blue 一一对应
         */
        beige: {
          50:  '#FDFAF2',
          100: '#F8EFD9',
          200: '#EFE3C4',
          300: '#E2D0A5',
        },
        sakura: {
          DEFAULT: '#F5C3B8',
          soft:    '#F5C3B8',
          strong:  '#EBA095',
        },
        'duck-blue': '#7CC4D0',
        'ink-warm':   '#2E2418',
        'ink-warm-2': '#6E5638',
        'ink-warm-3': '#A8896A',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'brand': '0 1px 2px rgba(245,159,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
        'brand-lg': '0 4px 12px rgba(245,159,0,0.28)',
        'card': '0 1px 2px rgba(73,80,87,0.05), 0 4px 12px rgba(73,80,87,0.06)',
      },
      keyframes: {
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        slideInDown: 'slideInDown 0.2s ease-out forwards',
        slideInUp: 'slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fadeIn: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
