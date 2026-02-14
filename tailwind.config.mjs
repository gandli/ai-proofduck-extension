/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg1: 'var(--bg1)',
        bg2: 'var(--bg2)',
        card: 'var(--card)',
        t1: 'var(--t1)',
        t2: 'var(--t2)',
        t3: 'var(--t3)',
        ac: 'var(--ac)',
        acd: 'var(--acd)',
        acl: 'var(--acl)',
        acg: 'var(--acg)',
        b1: 'var(--bd)', // mapping bd to b1 for border
        bd: 'var(--bd)',
        bdl: 'var(--bdl)',
        sh: 'var(--sh)',
        ok: 'var(--ok)',
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 24px -1px rgba(23, 23, 23, 0.06), 0 2px 8px -1px rgba(23, 23, 23, 0.04)',
        card: '0 12px 40px -12px rgba(23, 23, 23, 0.1)',
        floating: '0 20px 50px -12px rgba(23, 23, 23, 0.15)',
        glass: '0 8px 32px 0 rgba(23, 23, 23, 0.1)',
      },
      borderRadius: {
        '2xl': '24px',
        '3xl': '32px',
      },
      keyframes: {
        zoom: {
          '0%': { transform: 'scale(0)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-slide': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'hero-pulse': {
          '0%': { opacity: '0.8', transform: 'scale(1)' },
          '100%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
      animation: {
        zoom: 'zoom 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-slide': 'fade-slide 1.2s ease-out forwards',
        'hero-pulse': 'hero-pulse 8s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
