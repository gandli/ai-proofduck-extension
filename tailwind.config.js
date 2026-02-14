/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{html,ts,tsx}",
    "./components/**/*.{html,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#ff5a11',
          'orange-light': '#fff5eb',
          'orange-dark': '#e04800',
          'dark-bg': '#1a1a2e',
          'dark-surface': '#2d2d44',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
